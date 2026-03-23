-- Athlete Insight Database Schema
-- MVP Version for Volleyball Analysis

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase Auth)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Athletes table
CREATE TABLE public.athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  gender text,
  birth_date date,
  primary_sport text NOT NULL CHECK (primary_sport IN ('volleyball', 'running', 'fitness')),
  position text,
  height_cm integer,
  weight_kg numeric(5,2),
  experience_level text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Analysis Sessions table (core table)
CREATE TABLE public.analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  sport_type text NOT NULL CHECK (sport_type IN ('volleyball', 'running', 'fitness')),
  title text NOT NULL,
  session_date date NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  input_method text NOT NULL DEFAULT 'manual' CHECK (input_method IN ('manual', 'csv', 'image', 'api')),
  raw_input jsonb NOT NULL DEFAULT '{}',
  derived_metrics jsonb DEFAULT '{}',
  overall_score numeric(5,2),
  report_json jsonb,
  summary_text text,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Volleyball specific inputs
CREATE TABLE public.volleyball_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_session_id uuid NOT NULL UNIQUE REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  match_name text NOT NULL,
  opponent text,
  player_position text,
  total_points integer DEFAULT 0,
  total_points_lost integer DEFAULT 0,
  serve_aces integer DEFAULT 0,
  serve_errors integer DEFAULT 0,
  attack_kills integer DEFAULT 0,
  attack_errors integer DEFAULT 0,
  blocked_times integer DEFAULT 0,
  reception_success_rate numeric(5,2),
  block_points integer DEFAULT 0,
  digs integer DEFAULT 0,
  clutch_performance_score numeric(5,2),
  error_tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Running specific inputs
CREATE TABLE public.running_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_session_id uuid NOT NULL UNIQUE REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  workout_name text,
  distance_km numeric(6,2),
  duration_seconds integer,
  avg_pace_seconds integer,
  avg_heart_rate integer,
  max_heart_rate integer,
  cadence integer,
  elevation_gain_m integer,
  training_goal text,
  perceived_exertion integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fitness specific inputs
CREATE TABLE public.fitness_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_session_id uuid NOT NULL UNIQUE REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  workout_name text,
  muscle_groups text[] DEFAULT '{}',
  total_sets integer,
  total_reps integer,
  total_volume numeric(10,2),
  avg_rpe numeric(4,2),
  duration_minutes integer,
  training_goal text,
  fatigue_level integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance Tags (taxonomy)
CREATE TABLE public.performance_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_type text NOT NULL CHECK (sport_type IN ('volleyball', 'running', 'fitness')),
  tag_code text NOT NULL UNIQUE,
  tag_name text NOT NULL,
  tag_category text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Analysis Tag Links
CREATE TABLE public.analysis_tag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_session_id uuid NOT NULL REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  performance_tag_id uuid NOT NULL REFERENCES public.performance_tags(id) ON DELETE CASCADE,
  severity numeric(4,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(analysis_session_id, performance_tag_id)
);

-- Indexes
CREATE INDEX idx_athletes_user_id ON public.athletes(user_id);
CREATE INDEX idx_analysis_sessions_athlete_id ON public.analysis_sessions(athlete_id);
CREATE INDEX idx_analysis_sessions_sport_type ON public.analysis_sessions(sport_type);
CREATE INDEX idx_analysis_sessions_session_date ON public.analysis_sessions(session_date DESC);
CREATE INDEX idx_analysis_sessions_status ON public.analysis_sessions(status);

-- RLS Policies (basic setup)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volleyball_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.running_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_tag_links ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/write their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Athletes: Users can CRUD their own athletes
CREATE POLICY "Users can view own athletes"
  ON public.athletes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own athletes"
  ON public.athletes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own athletes"
  ON public.athletes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own athletes"
  ON public.athletes FOR DELETE
  USING (auth.uid() = user_id);

-- Analysis Sessions: Users can CRUD sessions for their athletes
CREATE POLICY "Users can view own sessions"
  ON public.analysis_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes
      WHERE athletes.id = analysis_sessions.athlete_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own sessions"
  ON public.analysis_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes
      WHERE athletes.id = analysis_sessions.athlete_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions"
  ON public.analysis_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes
      WHERE athletes.id = analysis_sessions.athlete_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sessions"
  ON public.analysis_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes
      WHERE athletes.id = analysis_sessions.athlete_id
      AND athletes.user_id = auth.uid()
    )
  );

-- Similar policies for input tables
CREATE POLICY "Users can view own volleyball inputs"
  ON public.volleyball_inputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = volleyball_inputs.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

-- Performance Tags: Public read, admin write
CREATE POLICY "Anyone can view performance tags"
  ON public.performance_tags FOR SELECT
  TO authenticated, anon
  USING (true);

-- Insert sample performance tags
INSERT INTO public.performance_tags (sport_type, tag_code, tag_name, tag_category, description) VALUES
  ('volleyball', 'VB_SERVE_UNSTABLE', '发球不稳', '技术', '发球失误次数偏多，动作稳定性不足'),
  ('volleyball', 'VB_CLUTCH_WEAK', '关键分弱', '心理', '关键分处理不够冷静，高压下表现下滑'),
  ('volleyball', 'VB_RECEPTION_VOLATILE', '一传波动', '技术', '接发到位率不稳定，预判和步法需要调整'),
  ('volleyball', 'VB_ATTACK_EFFECTIVE', '进攻高效', '技术', '扣球成功率高，能够有效得分'),
  ('volleyball', 'VB_ATTACK_EFFICIENT', '进攻有效率', '技术', '扣球效率良好，失误控制得当'),
  ('volleyball', 'VB_BLOCK_ACTIVE', '拦网积极', '防守', '拦网参与度高，能有效压制对手'),
  ('volleyball', 'VB_DEFENSE_SOLID', '防守扎实', '防守', '救球表现稳定，防守积极性强'),
  ('volleyball', 'VB_ERROR_PRONE', '失误偏多', '稳定性', '多项失误指标偏高，基础技术需要夯实'),
  ('running', 'RUN_PACE_FADE', '配速衰减', '耐力', '后半程配速明显下降'),
  ('running', 'RUN_HR_HIGH', '心率偏高', '强度', '平均心率高于预期范围'),
  ('fitness', 'FIT_RECOVERY_POOR', '恢复不足', '恢复', '训练后疲劳感明显，恢复状态不佳');
