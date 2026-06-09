
DROP FUNCTION IF EXISTS public.staff_login(uuid, text, text);

-- 1) Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'validator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'event_admin';

-- 2) Permissions on event_staff
ALTER TABLE public.event_staff
  ADD COLUMN IF NOT EXISTS can_scan boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_view_guests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_guests boolean NOT NULL DEFAULT false;

-- 3) PIN audit log
CREATE TABLE IF NOT EXISTS public.pin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  success boolean NOT NULL,
  reason text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pin_audit_log TO authenticated;
GRANT ALL ON public.pin_audit_log TO service_role;
ALTER TABLE public.pin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read pin audit" ON public.pin_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = pin_audit_log.event_id AND e.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_pin_audit_event_time ON public.pin_audit_log(event_id, created_at DESC);

-- 4) Lockout tracking
CREATE TABLE IF NOT EXISTS public.staff_pin_lockout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name_lc text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, full_name_lc)
);
GRANT SELECT ON public.staff_pin_lockout TO authenticated;
GRANT ALL ON public.staff_pin_lockout TO service_role;
ALTER TABLE public.staff_pin_lockout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read lockouts" ON public.staff_pin_lockout FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = staff_pin_lockout.event_id AND e.user_id = auth.uid()));

-- 5) Subscriptions
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('essai', 'pro', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'essai',
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 6) staff_login (new signature) with lockout + audit
CREATE OR REPLACE FUNCTION public.staff_login(_event_id uuid, _full_name text, _pin text)
RETURNS TABLE(session_token uuid, staff_id uuid, event_title text, expires_at timestamptz,
              can_scan boolean, can_view_guests boolean, can_manage_guests boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _s record;
  _tok uuid;
  _exp timestamptz;
  _name_lc text := lower(_full_name);
  _lock record;
  _max_attempts constant integer := 5;
  _lock_minutes constant integer := 15;
  _found boolean;
BEGIN
  SELECT * INTO _lock FROM public.staff_pin_lockout
    WHERE event_id = _event_id AND full_name_lc = _name_lc;
  IF FOUND AND _lock.locked_until IS NOT NULL AND _lock.locked_until > now() THEN
    INSERT INTO public.pin_audit_log (event_id, full_name, success, reason)
      VALUES (_event_id, _full_name, false, 'locked');
    RAISE EXCEPTION 'Compte verrouillé. Réessayez après %', to_char(_lock.locked_until, 'HH24:MI');
  END IF;

  SELECT s.id, s.pin_hash, e.title, s.can_scan, s.can_view_guests, s.can_manage_guests INTO _s
    FROM public.event_staff s JOIN public.events e ON e.id = s.event_id
   WHERE s.event_id = _event_id AND lower(s.full_name) = _name_lc;
  _found := FOUND;

  IF NOT _found OR _s.pin_hash <> crypt(_pin, _s.pin_hash) THEN
    INSERT INTO public.staff_pin_lockout (event_id, full_name_lc, attempts, locked_until, updated_at)
      VALUES (_event_id, _name_lc, 1, NULL, now())
    ON CONFLICT (event_id, full_name_lc) DO UPDATE
      SET attempts = staff_pin_lockout.attempts + 1,
          locked_until = CASE
            WHEN staff_pin_lockout.attempts + 1 >= _max_attempts
            THEN now() + (_lock_minutes || ' minutes')::interval
            ELSE NULL END,
          updated_at = now();
    INSERT INTO public.pin_audit_log (event_id, full_name, success, reason)
      VALUES (_event_id, _full_name, false, CASE WHEN NOT _found THEN 'unknown_user' ELSE 'bad_pin' END);
    RAISE EXCEPTION 'Identifiants invalides';
  END IF;

  DELETE FROM public.staff_pin_lockout WHERE event_id = _event_id AND full_name_lc = _name_lc;
  INSERT INTO public.pin_audit_log (event_id, full_name, success) VALUES (_event_id, _full_name, true);

  _exp := now() + interval '8 hours';
  INSERT INTO public.event_staff_sessions (staff_id, event_id, expires_at)
  VALUES (_s.id, _event_id, _exp)
  RETURNING token INTO _tok;
  RETURN QUERY SELECT _tok, _s.id, _s.title, _exp, _s.can_scan, _s.can_view_guests, _s.can_manage_guests;
END $$;

-- 7) Admin helpers
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  SELECT jsonb_build_object(
    'total_events', (SELECT count(*) FROM public.events),
    'total_guests', (SELECT count(*) FROM public.guests),
    'total_users', (SELECT count(*) FROM public.profiles),
    'checked_in_today', (SELECT count(*) FROM public.guests WHERE checked_in_at >= current_date),
    'rsvp_confirmed', (SELECT count(*) FROM public.guests WHERE rsvp_status = 'confirme'),
    'rsvp_pending', (SELECT count(*) FROM public.guests WHERE rsvp_status = 'en_attente'),
    'rsvp_refused', (SELECT count(*) FROM public.guests WHERE rsvp_status = 'refuse')
  ) INTO _r;
  RETURN _r;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_events()
RETURNS TABLE(id uuid, title text, type event_type, status event_status, event_date timestamptz,
              owner_email text, guests_count bigint, checked_in_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  RETURN QUERY
    SELECT e.id, e.title, e.type, e.status, e.event_date,
           u.email::text,
           (SELECT count(*) FROM public.guests g WHERE g.event_id = e.id),
           (SELECT count(*) FROM public.guests g WHERE g.event_id = e.id AND g.checked_in_at IS NOT NULL)
    FROM public.events e
    LEFT JOIN auth.users u ON u.id = e.user_id
    ORDER BY e.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(user_id uuid, email text, full_name text, plan plan_tier, events_count bigint, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, p.full_name, COALESCE(s.plan, 'essai'::plan_tier),
           (SELECT count(*) FROM public.events e WHERE e.user_id = u.id),
           u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    ORDER BY u.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_find_invitation(_query text)
RETURNS TABLE(guest_id uuid, full_name text, email text, phone text, invite_token text,
              rsvp_status rsvp_status, checked_in_at timestamptz, event_id uuid, event_title text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  RETURN QUERY
    SELECT g.id, g.full_name, g.email, g.phone, g.invite_token, g.rsvp_status, g.checked_in_at,
           e.id, e.title
    FROM public.guests g JOIN public.events e ON e.id = g.event_id
    WHERE g.invite_token = _query
       OR g.full_name ILIKE '%' || _query || '%'
       OR g.email ILIKE '%' || _query || '%'
    LIMIT 50;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reset_checkin(_guest_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  UPDATE public.guests SET checked_in_at = NULL WHERE id = _guest_id;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_token(_guest_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  UPDATE public.guests SET invite_token = encode(extensions.gen_random_bytes(16), 'hex')
   WHERE id = _guest_id
   RETURNING invite_token INTO _t;
  RETURN _t;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_plan(_user_id uuid, _plan plan_tier)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  INSERT INTO public.subscriptions (user_id, plan) VALUES (_user_id, _plan)
  ON CONFLICT (user_id) DO UPDATE SET plan = _plan, updated_at = now();
END $$;

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
