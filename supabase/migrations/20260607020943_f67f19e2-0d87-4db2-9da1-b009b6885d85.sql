
DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

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
  event_cover_image_url text,
  event_template public.invitation_template,
  event_custom_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.full_name, g.companions, g.rsvp_status,
         e.id, e.title, e.type, e.event_date, e.location, e.description, e.cover_image_url,
         e.template, e.custom_message
  FROM public.guests g
  JOIN public.events e ON e.id = g.event_id
  WHERE g.invite_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
