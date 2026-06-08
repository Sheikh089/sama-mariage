
CREATE OR REPLACE FUNCTION public.checkin_guest(_token text)
RETURNS TABLE (
  guest_id uuid,
  full_name text,
  companions integer,
  rsvp_status rsvp_status,
  event_id uuid,
  event_title text,
  already_checked_in boolean,
  checked_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _g record;
  _was_already boolean;
BEGIN
  SELECT g.id, g.full_name, g.companions, g.rsvp_status, g.event_id, g.checked_in_at, e.title, e.user_id
    INTO _g
  FROM public.guests g
  JOIN public.events e ON e.id = g.event_id
  WHERE g.invite_token = _token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable';
  END IF;

  IF _g.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  _was_already := _g.checked_in_at IS NOT NULL;

  IF NOT _was_already THEN
    UPDATE public.guests SET checked_in_at = now() WHERE id = _g.id
    RETURNING checked_in_at INTO _g.checked_in_at;
  END IF;

  RETURN QUERY SELECT _g.id, _g.full_name, _g.companions, _g.rsvp_status,
                      _g.event_id, _g.title, _was_already, _g.checked_in_at;
END;
$$;

REVOKE ALL ON FUNCTION public.checkin_guest(text) FROM public;
GRANT EXECUTE ON FUNCTION public.checkin_guest(text) TO authenticated;
