-- Unified diagnosis records for canonical reports

CREATE TABLE IF NOT EXISTS public.diagnosis_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_record_id text NOT NULL,
  sport_type text NOT NULL CHECK (sport_type IN ('volleyball', 'running', 'gym')),
  athlete_local_id text,
  athlete_name text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_date date NOT NULL,
  overall_score numeric(5,2) NOT NULL,
  verdict text NOT NULL,
  range_label text NOT NULL,
  confidence_label text NOT NULL,
  canonical_report jsonb NOT NULL,
  raw_report jsonb,
  feedback text CHECK (feedback IN ('helpful', 'missed')),
  source text NOT NULL DEFAULT 'pipeline' CHECK (source IN ('legacy', 'pipeline')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_record_id)
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_records_user_created_at
  ON public.diagnosis_records(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnosis_records_user_athlete
  ON public.diagnosis_records(user_id, athlete_local_id, created_at DESC);

ALTER TABLE public.diagnosis_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnosis records"
  ON public.diagnosis_records FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own diagnosis records"
  ON public.diagnosis_records FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own diagnosis records"
  ON public.diagnosis_records FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own diagnosis records"
  ON public.diagnosis_records FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_diagnosis_records_updated_at
  BEFORE UPDATE ON public.diagnosis_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
