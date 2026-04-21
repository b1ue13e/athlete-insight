-- Unify analysis_sessions so running / gym / volleyball all share one persistence base

ALTER TABLE public.analysis_sessions
  DROP CONSTRAINT IF EXISTS analysis_sessions_sport_type_check;

ALTER TABLE public.analysis_sessions
  ADD CONSTRAINT analysis_sessions_sport_type_check
  CHECK (sport_type IN ('volleyball', 'running', 'fitness', 'gym'));

ALTER TABLE public.analysis_sessions
  DROP CONSTRAINT IF EXISTS analysis_sessions_input_method_check;

ALTER TABLE public.analysis_sessions
  ADD CONSTRAINT analysis_sessions_input_method_check
  CHECK (input_method IN ('manual', 'csv', 'image', 'api', 'watch', 'imported'));
