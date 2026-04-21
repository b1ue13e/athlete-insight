-- Athlete profile cloud upgrades
-- - allow gym as a first-class primary sport
-- - persist team separately from notes

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS team text;

ALTER TABLE public.athletes
  DROP CONSTRAINT IF EXISTS athletes_primary_sport_check;

ALTER TABLE public.athletes
  ADD CONSTRAINT athletes_primary_sport_check
  CHECK (primary_sport IN ('volleyball', 'running', 'fitness', 'gym'));
