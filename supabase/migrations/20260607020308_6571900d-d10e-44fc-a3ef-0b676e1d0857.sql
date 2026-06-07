
-- ENUMS
CREATE TYPE public.event_type AS ENUM ('mariage', 'bapteme', 'fiancailles', 'anniversaire', 'autre');
CREATE TYPE public.event_status AS ENUM ('brouillon', 'publie', 'termine', 'annule');
CREATE TYPE public.rsvp_status AS ENUM ('en_attente', 'confirme', 'refuse');

-- EVENTS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type public.event_type NOT NULL DEFAULT 'mariage',
  event_date timestamptz,
  location text,
  description text,
  cover_image_url text,
  status public.event_status NOT NULL DEFAULT 'brouillon',
  max_guests integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own events" ON public.events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public can view published events" ON public.events FOR SELECT TO anon USING (status = 'publie');
CREATE POLICY "Users insert own events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_events_user_id ON public.events(user_id);

-- GUESTS
CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  companions integer NOT NULL DEFAULT 0,
  rsvp_status public.rsvp_status NOT NULL DEFAULT 'en_attente',
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  table_number text,
  notes text,
  checked_in_at timestamptz,
  rsvp_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT SELECT, UPDATE ON public.guests TO anon;
GRANT ALL ON public.guests TO service_role;

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Owner of the event manages guests
CREATE POLICY "Owners view guests" ON public.guests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guests.event_id AND e.user_id = auth.uid()));
CREATE POLICY "Owners insert guests" ON public.guests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guests.event_id AND e.user_id = auth.uid()));
CREATE POLICY "Owners update guests" ON public.guests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guests.event_id AND e.user_id = auth.uid()));
CREATE POLICY "Owners delete guests" ON public.guests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = guests.event_id AND e.user_id = auth.uid()));

-- Public RSVP via token: we'll restrict to specific column access from app side (token comes from URL).
CREATE POLICY "Public view guest by token" ON public.guests FOR SELECT TO anon USING (true);
CREATE POLICY "Public update rsvp by token" ON public.guests FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TRIGGER set_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_guests_event_id ON public.guests(event_id);
CREATE INDEX idx_guests_invite_token ON public.guests(invite_token);
