
-- Enable pgcrypto for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- App roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'scanner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- event_staff: staff per event (PIN-protected scanners)
CREATE TABLE IF NOT EXISTS public.event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  pin_hash text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'scanner',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO authenticated;
GRANT ALL ON public.event_staff TO service_role;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage event_staff" ON public.event_staff FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_staff.event_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_staff.event_id AND e.user_id = auth.uid()));

CREATE TRIGGER trg_event_staff_updated BEFORE UPDATE ON public.event_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- event_staff_sessions: short-lived session token after PIN verification
CREATE TABLE IF NOT EXISTS public.event_staff_sessions (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.event_staff(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_staff_sessions TO authenticated;
GRANT ALL ON public.event_staff_sessions TO service_role;
ALTER TABLE public.event_staff_sessions ENABLE ROW LEVEL SECURITY;
-- No direct user access; all access via SECURITY DEFINER functions.

-- Create staff PIN (owner only)
CREATE OR REPLACE FUNCTION public.create_event_staff(_event_id uuid, _full_name text, _pin text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _staff_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;
  IF length(coalesce(_pin,'')) < 4 THEN
    RAISE EXCEPTION 'PIN trop court (min 4)';
  END IF;
  INSERT INTO public.event_staff (event_id, full_name, pin_hash)
  VALUES (_event_id, _full_name, crypt(_pin, gen_salt('bf')))
  RETURNING id INTO _staff_id;
  RETURN _staff_id;
END $$;

-- Verify PIN, returns session token valid 8h
CREATE OR REPLACE FUNCTION public.staff_login(_event_id uuid, _full_name text, _pin text)
RETURNS TABLE(session_token uuid, staff_id uuid, event_title text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s record; _tok uuid; _exp timestamptz;
BEGIN
  SELECT s.id, s.pin_hash, e.title INTO _s
    FROM public.event_staff s JOIN public.events e ON e.id = s.event_id
   WHERE s.event_id = _event_id AND lower(s.full_name) = lower(_full_name);
  IF NOT FOUND OR _s.pin_hash <> crypt(_pin, _s.pin_hash) THEN
    RAISE EXCEPTION 'Identifiants invalides';
  END IF;
  _exp := now() + interval '8 hours';
  INSERT INTO public.event_staff_sessions (staff_id, event_id, expires_at)
  VALUES (_s.id, _event_id, _exp)
  RETURNING token INTO _tok;
  RETURN QUERY SELECT _tok, _s.id, _s.title, _exp;
END $$;

-- Updated checkin: accept owner-auth OR staff session token
CREATE OR REPLACE FUNCTION public.checkin_guest(_token text, _session_token uuid DEFAULT NULL)
RETURNS TABLE(guest_id uuid, full_name text, companions integer, rsvp_status rsvp_status,
              event_id uuid, event_title text, already_checked_in boolean, checked_in_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _g record; _was boolean; _authorized boolean := false;
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

  _was := _g.checked_in_at IS NOT NULL;
  IF NOT _was THEN
    UPDATE public.guests SET checked_in_at = now() WHERE id = _g.id RETURNING checked_in_at INTO _g.checked_in_at;
  END IF;

  RETURN QUERY SELECT _g.id, _g.full_name, _g.companions, _g.rsvp_status,
                      _g.event_id, _g.title, _was, _g.checked_in_at;
END $$;
