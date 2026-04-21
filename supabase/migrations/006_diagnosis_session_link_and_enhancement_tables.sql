-- Hard-link diagnosis_records to analysis_sessions
-- and add sport-specific enhancement tables under the shared session trunk.

ALTER TABLE public.diagnosis_records
  ADD COLUMN IF NOT EXISTS analysis_session_id uuid REFERENCES public.analysis_sessions(id) ON DELETE CASCADE;

-- Best-effort backfill for records whose local_record_id already matches the session id.
UPDATE public.diagnosis_records
SET analysis_session_id = analysis_sessions.id
FROM public.analysis_sessions
WHERE public.diagnosis_records.analysis_session_id IS NULL
  AND public.diagnosis_records.local_record_id ~ '^[0-9a-fA-F-]{36}$'
  AND analysis_sessions.id::text = public.diagnosis_records.local_record_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_diagnosis_records_analysis_session_id
  ON public.diagnosis_records(analysis_session_id)
  WHERE analysis_session_id IS NOT NULL;

-- Gym-specific enhancement table
CREATE TABLE IF NOT EXISTS public.gym_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_session_id uuid NOT NULL UNIQUE REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  goal_type text NOT NULL,
  split_type text NOT NULL,
  session_tag text NOT NULL,
  duration_minutes integer,
  perceived_fatigue numeric(4,2),
  soreness numeric(4,2),
  sleep_quality numeric(4,2),
  exercises jsonb NOT NULL DEFAULT '[]',
  planned_session jsonb,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_inputs_analysis_session_id
  ON public.gym_inputs(analysis_session_id);

ALTER TABLE public.gym_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gym inputs"
  ON public.gym_inputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = gym_inputs.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own gym inputs"
  ON public.gym_inputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = gym_inputs.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own gym inputs"
  ON public.gym_inputs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = gym_inputs.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own gym inputs"
  ON public.gym_inputs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = gym_inputs.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_gym_inputs_updated_at
  BEFORE UPDATE ON public.gym_inputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
