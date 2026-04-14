export type SportType = "volleyball" | "running" | "fitness" | "gym";

export type VolleyballPosition = "主攻" | "副攻" | "二传" | "接应" | "自由人";

// ============ 报告相关类型 ============

export interface ReportMeta {
  sport_type: SportType;
  session_id: string;
  title: string;
  session_date: string;
  generated_at: string;
  report_version: string;
  position_template?: string;
  scoring_version?: string;
  model_version?: string;
}

export interface SubScores {
  [key: string]: number;
  scoring_contribution: number;
  error_control: number;
  stability: number;
  clutch_performance: number;
}

export interface ReportOverview {
  overall_score: number;
  rating_label: string;
  one_line_summary: string;
  sub_scores?: SubScores;
  position_analysis?: string;
  confidence_score?: number;
}

export interface ReportItem {
  title: string;
  detail: string;
  metric_refs?: string[];
  severity?: number;
}

export interface RecommendationItem {
  priority: number;
  title: string;
  detail: string;
}

export interface RootCauseItem {
  cause: string;
  evidence: string;
}

export interface ChartItem {
  chart_type: "bar" | "line" | "radar" | "pie";
  chart_key: string;
  title: string;
  data: Array<Record<string, string | number>>;
}

export interface ScoringDetails {
  scoring?: {
    attack_efficiency: number;
    serve_efficiency: number;
    block_impact: number;
    defense_impact: number;
    raw_score: number;
  };
  error_control?: {
    serve_error_rate: number;
    attack_error_rate: number;
    blocked_rate: number;
    raw_score: number;
  };
  stability?: {
    reception_normalized: number;
    error_density_normalized: number;
    raw_score: number;
  };
  clutch?: {
    clutch_normalized: number;
    point_ratio_normalized: number;
    raw_score: number;
  };
}

export interface ReliabilityNotes {
  data_completeness: string;
  sample_size_note: string;
  confidence_level: string;
  scoring_engine_version?: string;
  position_template_applied?: string;
  calculation_time_ms?: number;
}

// 调试信息类型
export interface DebugInfo {
  engine_version: string;
  scoring_version: string;
  calculation_time_ms: number;
  data_quality: {
    completeness: number;
    missing_fields: string[];
    low_confidence_fields: string[];
    dimension_confidence: Record<string, number>;
  };
  scoring_steps: {
    step: string;
    formula?: string;
  }[];
  intermediate_scores: Record<string, number>;
}

export interface ReportJSON {
  meta: ReportMeta;
  overview: ReportOverview;
  strengths: ReportItem[];
  weaknesses: ReportItem[];
  root_causes: RootCauseItem[];
  recommendations: RecommendationItem[];
  metrics: {
    raw: Record<string, number | null>;
    derived: Record<string, number | null>;
    scoring_details?: ScoringDetails;
  };
  charts: ChartItem[];
  tags: string[];
  reliability_notes?: ReliabilityNotes;
  _debug?: DebugInfo;
}

// ============ 数据库类型 ============

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Athlete {
  id: string;
  user_id: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
  primary_sport: SportType;
  position: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisSession {
  id: string;
  athlete_id: string;
  sport_type: SportType;
  title: string;
  session_date: string;
  status: "draft" | "processing" | "completed" | "failed";
  input_method: "manual" | "csv" | "image" | "api";
  raw_input: Record<string, unknown>;
  derived_metrics: Record<string, unknown> | null;
  overall_score: number | null;
  report_json: ReportJSON | null;
  summary_text: string | null;
  model_version: string | null;
  created_at: string;
  updated_at: string;
  delta_vs_previous?: {
    overall_score_change: number;
    sub_scores_change: Partial<SubScores>;
    trend_direction: "improving" | "declining" | "stable";
  };
}

export interface VolleyballInput {
  id: string;
  analysis_session_id: string;
  match_name: string;
  opponent: string | null;
  player_position: VolleyballPosition | null;
  total_points: number;
  total_points_lost: number;
  serve_aces: number;
  serve_errors: number;
  attack_kills: number;
  attack_errors: number;
  blocked_times: number;
  reception_success_rate: number | null;
  block_points: number;
  digs: number;
  clutch_performance_score: number | null;
  error_tags: string[];
  notes: string | null;
  created_at: string;
}

export interface RunningInput {
  id: string;
  analysis_session_id: string;
  workout_name: string;
  distance_km: number;
  duration_seconds: number;
  avg_heart_rate: number;
  max_heart_rate: number;
  cadence: number;
  elevation_gain_m: number;
  training_goal: string;
  perceived_exertion: number;
  notes: string;
  created_at: string;
}

export interface FitnessInput {
  id: string;
  analysis_session_id: string;
  workout_name: string;
  muscle_groups: string[];
  total_sets: number;
  total_reps: number;
  total_volume: number;
  avg_rpe: number;
  duration_minutes: number;
  training_goal: string;
  fatigue_level: number;
  notes: string;
  created_at: string;
}

// ============ 表单类型 ============

export interface VolleyballFormData {
  [key: string]: string | number | string[] | undefined;
  match_name: string;
  opponent: string;
  player_position: VolleyballPosition;
  session_date: string;
  total_points: number;
  total_points_lost: number;
  serve_aces: number;
  serve_errors: number;
  attack_kills: number;
  attack_errors: number;
  blocked_times: number;
  reception_success_rate: number;
  block_points: number;
  digs: number;
  clutch_performance_score: number;
  error_tags: string[];
  notes: string;
}

export interface RunningFormData {
  workout_name: string;
  distance_km: number;
  duration_seconds: number;
  avg_heart_rate: number;
  max_heart_rate: number;
  cadence: number;
  elevation_gain_m: number;
  training_goal: string;
  perceived_exertion: number;
  notes: string;
}

export interface FitnessFormData {
  workout_name: string;
  muscle_groups: string[];
  total_sets: number;
  total_reps: number;
  total_volume: number;
  avg_rpe: number;
  duration_minutes: number;
  training_goal: string;
  fatigue_level: number;
  notes: string;
}

// ============ 历史趋势分析类型 ============

export interface TrendAnalysis {
  vs_previous: {
    score_change: number;
    direction: "up" | "down" | "flat";
    significant_changes: Array<{
      metric: string;
      previous: number;
      current: number;
      change_percent: number;
    }>;
  };
  
  top_issues: Array<{
    tag: string;
    occurrence_count: number;
    trend: "improving" | "worsening" | "stable";
  }>;
  
  top_strengths: Array<{
    category: string;
    average_score: number;
    consistency: "high" | "medium" | "low";
  }>;
  
  long_term_trend: {
    direction: "improving" | "declining" | "fluctuating" | "stable";
    volatility: number;
    avg_score: number;
    best_score: number;
    worst_score: number;
  };
}
