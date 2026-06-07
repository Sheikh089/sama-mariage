
CREATE TYPE public.invitation_template AS ENUM ('traditionnel', 'moderne', 'luxe', 'minimaliste', 'gold_premium');

ALTER TABLE public.events
  ADD COLUMN template public.invitation_template NOT NULL DEFAULT 'gold_premium',
  ADD COLUMN custom_message text;
