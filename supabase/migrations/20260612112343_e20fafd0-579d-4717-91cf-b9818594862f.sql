
-- 1. Plan limits helper
CREATE OR REPLACE FUNCTION public.plan_limits(_plan plan_tier)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _plan
    WHEN 'premium' THEN jsonb_build_object('max_events', -1, 'max_guests_per_event', 2000, 'staff', true, 'premium_templates', true)
    WHEN 'pro'     THEN jsonb_build_object('max_events', 5,  'max_guests_per_event', 300,  'staff', true, 'premium_templates', false)
    ELSE                jsonb_build_object('max_events', 1,  'max_guests_per_event', 30,   'staff', false, 'premium_templates', false)
  END
$$;

-- 2. Effective plan for a user
CREATE OR REPLACE FUNCTION public.user_plan(_user_id uuid)
RETURNS plan_tier LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT plan FROM public.subscriptions WHERE user_id = _user_id), 'essai'::plan_tier)
$$;

-- 3. Real-time plan status for an event
CREATE OR REPLACE FUNCTION public.event_plan_status(_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _owner uuid; _plan plan_tier; _lim jsonb;
  _guests int; _events int;
  _over_guests boolean; _over_events boolean;
BEGIN
  SELECT user_id INTO _owner FROM public.events WHERE id = _event_id;
  IF _owner IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  _plan := public.user_plan(_owner);
  _lim := public.plan_limits(_plan);
  SELECT count(*) INTO _guests FROM public.guests WHERE event_id = _event_id;
  SELECT count(*) INTO _events FROM public.events WHERE user_id = _owner;
  _over_guests := (_lim->>'max_guests_per_event')::int <> -1 AND _guests > (_lim->>'max_guests_per_event')::int;
  _over_events := (_lim->>'max_events')::int <> -1 AND _events > (_lim->>'max_events')::int;
  RETURN jsonb_build_object(
    'plan', _plan, 'limits', _lim,
    'guests_count', _guests, 'events_count', _events,
    'over_guests', _over_guests, 'over_events', _over_events,
    'locked', (_over_guests OR _over_events)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.event_plan_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_limits(plan_tier) TO authenticated;

-- 4. Trigger: cap guests per event
CREATE OR REPLACE FUNCTION public.enforce_guest_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _plan plan_tier; _max int; _current int;
BEGIN
  SELECT user_id INTO _owner FROM public.events WHERE id = NEW.event_id;
  _plan := public.user_plan(_owner);
  _max := (public.plan_limits(_plan)->>'max_guests_per_event')::int;
  IF _max = -1 THEN RETURN NEW; END IF;
  SELECT count(*) INTO _current FROM public.guests WHERE event_id = NEW.event_id;
  IF _current >= _max THEN
    RAISE EXCEPTION 'Limite d''invités atteinte pour le palier % (% max). Mettez à niveau votre abonnement.', _plan, _max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_guest_quota ON public.guests;
CREATE TRIGGER trg_enforce_guest_quota BEFORE INSERT ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_guest_quota();

-- 5. Trigger: cap events per user
CREATE OR REPLACE FUNCTION public.enforce_event_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan plan_tier; _max int; _current int;
BEGIN
  _plan := public.user_plan(NEW.user_id);
  _max := (public.plan_limits(_plan)->>'max_events')::int;
  IF _max = -1 THEN RETURN NEW; END IF;
  SELECT count(*) INTO _current FROM public.events WHERE user_id = NEW.user_id;
  IF _current >= _max THEN
    RAISE EXCEPTION 'Limite d''événements atteinte pour le palier % (% max). Mettez à niveau votre abonnement.', _plan, _max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_event_quota ON public.events;
CREATE TRIGGER trg_enforce_event_quota BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_quota();

-- 6. checkin_guest: block when event is over plan limits
CREATE OR REPLACE FUNCTION public.checkin_guest(_token text, _session_token uuid DEFAULT NULL::uuid)
RETURNS TABLE(guest_id uuid, full_name text, companions integer, rsvp_status rsvp_status, event_id uuid, event_title text, already_checked_in boolean, checked_in_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _g record; _was boolean; _authorized boolean := false; _status jsonb;
BEGIN
  SELECT g.id, g.full_name, g.companions, g.rsvp_status, g.event_id, g.checked_in_at, e.title, e.user_id
    INTO _g
  FROM public.guests g JOIN public.events e ON e.id = g.event_id
  WHERE g.invite_token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation introuvable'; END IF;

  IF auth.uid() IS NOT NULL AND _g.user_id = auth.uid() THEN
    _authorized := true;
  ELSIF _session_token IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.event_staff_sessions
                WHERE token = _session_token AND event_id = _g.event_id AND expires_at > now()) THEN
      _authorized := true;
    END IF;
  END IF;
  IF NOT _authorized THEN RAISE EXCEPTION 'Non autorisé'; END IF;

  _status := public.event_plan_status(_g.event_id);
  IF (_status->>'locked')::boolean THEN
    RAISE EXCEPTION 'Validation bloquée : palier % dépassé (% invités / max %). Mettez à niveau l''abonnement pour réactiver le scanner.',
      _status->>'plan', _status->>'guests_count', _status->'limits'->>'max_guests_per_event'
      USING ERRCODE = 'check_violation';
  END IF;

  _was := _g.checked_in_at IS NOT NULL;
  IF NOT _was THEN
    UPDATE public.guests SET checked_in_at = now() WHERE id = _g.id RETURNING checked_in_at INTO _g.checked_in_at;
  END IF;

  RETURN QUERY SELECT _g.id, _g.full_name, _g.companions, _g.rsvp_status,
                      _g.event_id, _g.title, _was, _g.checked_in_at;
END $$;

-- 7. Admin overrides bypass via has_role('admin') in admin_* functions remain unchanged.
