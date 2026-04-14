-- Running Score v1.0 Schema Extension
-- 扩展 running_inputs 表以支持完整的四维评分系统

-- 扩展 running_inputs 表
ALTER TABLE public.running_inputs 
ADD COLUMN IF NOT EXISTS training_type text,
ADD COLUMN IF NOT EXISTS goal_type text,
ADD COLUMN IF NOT EXISTS splits integer[],
ADD COLUMN IF NOT EXISTS rpe integer,
ADD COLUMN IF NOT EXISTS feeling text,
ADD COLUMN IF NOT EXISTS planned_distance_km numeric(6,2),
ADD COLUMN IF NOT EXISTS planned_duration_min integer,
ADD COLUMN IF NOT EXISTS planned_pace_min integer,
ADD COLUMN IF NOT EXISTS planned_pace_max integer,
ADD COLUMN IF NOT EXISTS planned_hr_min integer,
ADD COLUMN IF NOT EXISTS planned_hr_max integer,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source IN ('manual', 'watch', 'imported', 'strava')),
ADD COLUMN IF NOT EXISTS has_gps boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_heartrate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_splits boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT true;

-- 创建跑步分析结果表（存储评分详情）
CREATE TABLE IF NOT EXISTS public.running_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_session_id uuid NOT NULL UNIQUE REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  
  -- 四维评分
  completion_score numeric(5,2) NOT NULL,
  rhythm_score numeric(5,2) NOT NULL,
  load_score numeric(5,2) NOT NULL,
  value_score numeric(5,2) NOT NULL,
  overall_score numeric(5,2) NOT NULL,
  
  -- 各维度状态
  completion_status text,
  rhythm_status text,
  load_status text,
  value_status text,
  
  -- 偏差识别（JSON数组）
  deviations jsonb DEFAULT '[]',
  primary_deviation_type text,
  
  -- 可信度
  confidence_score numeric(5,2),
  confidence_level text,
  confidence_reasons text[],
  
  -- 总结
  summary_oneliner text,
  summary_praised text,
  summary_fix text,
  summary_next_advice text,
  
  -- 引擎版本
  engine_version text DEFAULT '1.0.0',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建周训练块汇总表
CREATE TABLE IF NOT EXISTS public.running_weekly_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- 时间范围
  week_start date NOT NULL,
  week_end date NOT NULL,
  
  -- 聚合统计
  total_distance_km numeric(8,2) DEFAULT 0,
  total_duration_min integer DEFAULT 0,
  sessions_count integer DEFAULT 0,
  rest_days integer DEFAULT 0,
  
  -- 强度分布
  easy_percent numeric(5,2) DEFAULT 0,
  hard_percent numeric(5,2) DEFAULT 0,
  long_run_completed boolean DEFAULT false,
  intensity_distribution text,
  
  -- 趋势与风险
  volume_change_percent numeric(5,2) DEFAULT 0,
  fatigue_risk text,
  recovery_adequacy text,
  
  -- 周报告
  most_effective_session text,
  biggest_issue text,
  next_week_advice text[],
  
  -- 关联的训练会话ID
  session_ids uuid[] DEFAULT '{}',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(athlete_id, week_start)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_running_analysis_results_session_id 
  ON public.running_analysis_results(analysis_session_id);

CREATE INDEX IF NOT EXISTS idx_running_weekly_blocks_athlete_id 
  ON public.running_weekly_blocks(athlete_id);

CREATE INDEX IF NOT EXISTS idx_running_weekly_blocks_user_id 
  ON public.running_weekly_blocks(user_id);

CREATE INDEX IF NOT EXISTS idx_running_weekly_blocks_date 
  ON public.running_weekly_blocks(week_start DESC);

-- 启用 RLS
ALTER TABLE public.running_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.running_weekly_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for running_analysis_results
CREATE POLICY "Users can view own running analysis results"
  ON public.running_analysis_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = running_analysis_results.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own running analysis results"
  ON public.running_analysis_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = running_analysis_results.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own running analysis results"
  ON public.running_analysis_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = running_analysis_results.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own running analysis results"
  ON public.running_analysis_results FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      JOIN public.athletes ON athletes.id = analysis_sessions.athlete_id
      WHERE analysis_sessions.id = running_analysis_results.analysis_session_id
      AND athletes.user_id = auth.uid()
    )
  );

-- RLS Policies for running_weekly_blocks
CREATE POLICY "Users can view own weekly blocks"
  ON public.running_weekly_blocks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own weekly blocks"
  ON public.running_weekly_blocks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own weekly blocks"
  ON public.running_weekly_blocks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own weekly blocks"
  ON public.running_weekly_blocks FOR DELETE
  USING (user_id = auth.uid());

-- 添加跑步相关的性能标签
INSERT INTO public.performance_tags (sport_type, tag_code, tag_name, tag_category, description) VALUES
  ('running', 'RUN_EASY_TOO_FAST', '轻松跑太快', '强度控制', '轻松跑进入灰区，有氧收益下降'),
  ('running', 'RUN_TEMPO_FADE', '节奏跑掉速', '配速控制', '节奏跑前快后崩，无法维持乳酸阈配速'),
  ('running', 'RUN_INTERVAL_BLOW', '间歇失控', '配速控制', '间歇跑前面过猛导致后面无法完成'),
  ('running', 'RUN_LONG_FADE', '长距离掉速', '耐力', '长距离后半程掉速严重，耐力基础不足'),
  ('running', 'RUN_RECOVERY_HARD', '恢复跑太拼', '强度控制', '恢复跑强度过高，影响恢复效果'),
  ('running', 'RUN_PACE_STABLE', '配速稳定', '节奏控制', '全程配速控制良好，节奏感出色'),
  ('running', 'RUN_HR_CONTROL', '心率控制好', '有氧基础', '心率控制精准，有氧基础扎实'),
  ('running', 'RUN_COMPLETION_PERFECT', '完成度完美', '执行', '训练计划执行完美，符合所有预期'),
  ('running', 'RUN_OVERTRAINING_RISK', '过度训练风险', '恢复', '近期负荷过高，建议安排恢复')
ON CONFLICT (tag_code) DO NOTHING;

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为新增表添加自动更新时间戳
CREATE TRIGGER update_running_analysis_results_updated_at
  BEFORE UPDATE ON public.running_analysis_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_running_weekly_blocks_updated_at
  BEFORE UPDATE ON public.running_weekly_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
