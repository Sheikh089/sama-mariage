
-- Drop overly permissive anon policies on guests
DROP POLICY IF EXISTS "Public view guest by token" ON public.guests;
DROP POLICY IF EXISTS "Public update rsvp by token" ON public.guests;
REVOKE SELECT, UPDATE ON public.guests FROM anon;

-- Drop anon access on events (handled via RPC instead)
DROP POLICY IF EXISTS "Public can view published events" ON public.events;
REVOKE SELECT ON public.events FROM anon;

-- RPC: get invitation by token (returns guest + event basic info)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE (
  guest_id uuid,
  full_name text,
  companions integer,
  rsvp_status public.rsvp_status,
  event_id uuid,
  event_title text,
  event_type public.event_type,
  event_date timestamptz,
  event_location text,
  event_description text,
  event_cover_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.full_name, g.companions, g.rsvp_status,
         e.id, e.title, e.type, e.event_date, e.location, e.description, e.cover_image_url
  FROM public.guests g
  JOIN public.events e ON e.id = g.event_id
  WHERE g.invite_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- RPC: submit rsvp by token
CREATE OR REPLACE FUNCTION public.submit_rsvp(_token text, _status public.rsvp_status, _companions integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  UPDATE public.guests
     SET rsvp_status = _status,
         companions = GREATEST(0, COALESCE(_companions, 0)),
         rsvp_at = now()
   WHERE invite_token = _token;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_rsvp(text, public.rsvp_status, integer) TO anon, authenticated;
