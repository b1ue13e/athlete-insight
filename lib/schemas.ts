/**
 * Zod Schemas for Data Validation
 * 
 * 使用 Zod 进行运行时数据校验，确保：
 * 1. 前端表单数据符合预期
 * 2. API 入参合法
 * 3. 报告 JSON 结构正确
 */

import { z } from "zod"

// ============ 基础枚举 ============

export const SportTypeSchema = z.enum(["volleyball", "running", "fitness", "gym"])

export const VolleyballPositionSchema = z.enum(["主攻", "副攻", "二传", "接应", "自由人"])

// ============ 排球表单 Schema ============

export const VolleyballFormSchema = z.object({
  // 基本信息
  match_name: z.string().min(1, "比赛名称不能为空").max(100, "比赛名称过长"),
  opponent: z.string().max(50, "对手名称过长").optional().default(""),
  player_position: VolleyballPositionSchema,
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式错误"),
  
  // 得失分
  total_points: z.number().int().min(0, "得分不能为负").max(100, "得分过高"),
  total_points_lost: z.number().int().min(0, "丢分不能为负").max(100, "丢分过高"),
  
  // 发球
  serve_aces: z.number().int().min(0).max(20, "发球得分数量异常"),
  serve_errors: z.number().int().min(0).max(20, "发球失误数量异常"),
  
  // 进攻
  attack_kills: z.number().int().min(0).max(50, "扣球成功数量异常"),
  attack_errors: z.number().int().min(0).max(30, "扣球失误数量异常"),
  blocked_times: z.number().int().min(0).max(20, "被拦次数异常"),
  
  // 其他数据
  reception_success_rate: z.number().min(0).max(100, "一传到位率应在 0-100 之间"),
  block_points: z.number().int().min(0).max(15, "拦网得分异常"),
  digs: z.number().int().min(0).max(50, "救球数量异常"),
  clutch_performance_score: z.number().min(0).max(100, "关键分评分应在 0-100 之间"),
  
  // 标签和备注
  error_tags: z.array(z.string()).max(10, "标签过多").default([]),
  notes: z.string().max(500, "备注过长").optional().default(""),
}).refine((data) => {
  // 自定义校验：发球得分 + 失误不能超过合理范围
  return data.serve_aces + data.serve_errors <= 25
}, {
  message: "发球数据异常，请检查",
  path: ["serve_errors"],
}).refine((data) => {
  // 自定义校验：进攻成功 + 失误 + 被拦应该合理
  return data.attack_kills + data.attack_errors + data.blocked_times <= 60
}, {
  message: "进攻数据异常，请检查",
  path: ["attack_kills"],
}).refine((data) => {
  // 自由人不应该有进攻数据
  if (data.player_position === "自由人") {
    return data.attack_kills === 0 && data.attack_errors === 0 && data.blocked_times === 0
  }
  return true
}, {
  message: "自由人不应有进攻数据",
  path: ["attack_kills"],
})

export type VolleyballFormInput = z.infer<typeof VolleyballFormSchema>

// ============ 报告 JSON Schema ============

export const ReportMetaSchema = z.object({
  sport_type: SportTypeSchema,
  session_id: z.string().uuid(),
  title: z.string(),
  session_date: z.string(),
  generated_at: z.string().datetime(),
  report_version: z.string(),
  position_template: z.string().optional(),
})

export const SubScoresSchema = z.object({
  scoring_contribution: z.number().min(0).max(100),
  error_control: z.number().min(0).max(100),
  stability: z.number().min(0).max(100),
  clutch_performance: z.number().min(0).max(100),
})

export const ReportOverviewSchema = z.object({
  overall_score: z.number().min(0).max(100),
  rating_label: z.string(),
  one_line_summary: z.string(),
  sub_scores: SubScoresSchema.optional(),
  position_analysis: z.string().optional(),
})

export const ReportItemSchema = z.object({
  title: z.string(),
  detail: z.string(),
  metric_refs: z.array(z.string()).optional(),
  severity: z.number().min(0).max(1).optional(),
})

export const RecommendationItemSchema = z.object({
  priority: z.number().int().min(1).max(5),
  title: z.string(),
  detail: z.string(),
})

export const RootCauseItemSchema = z.object({
  cause: z.string(),
  evidence: z.string(),
})

export const ChartItemSchema = z.object({
  chart_type: z.enum(["bar", "line", "radar", "pie"]),
  chart_key: z.string(),
  title: z.string(),
  data: z.array(z.record(z.union([z.string(), z.number()]))),
})

export const ReliabilityNotesSchema = z.object({
  data_completeness: z.string(),
  sample_size_note: z.string(),
  confidence_level: z.string(),
})

export const ReportJSONSchema = z.object({
  meta: ReportMetaSchema,
  overview: ReportOverviewSchema,
  strengths: z.array(ReportItemSchema).max(5),
  weaknesses: z.array(ReportItemSchema).max(5),
  root_causes: z.array(RootCauseItemSchema).max(3),
  recommendations: z.array(RecommendationItemSchema).max(5),
  metrics: z.object({
    raw: z.record(z.union([z.number(), z.null()])),
    derived: z.record(z.union([z.number(), z.null()])),
    scoring_details: z.record(z.any()).optional(),
  }),
  charts: z.array(ChartItemSchema),
  tags: z.array(z.string()),
  reliability_notes: ReliabilityNotesSchema.optional(),
})

export type ReportJSONOutput = z.infer<typeof ReportJSONSchema>

// ============ API 请求 Schema ============

export const AnalyzeRequestSchema = z.object({
  sport_type: SportTypeSchema,
  data: z.record(z.any()),
  athlete_id: z.string().uuid().optional(),
  enhance_with_ai: z.boolean().default(false),
})

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>

// ============ 辅助函数 ============

/**
 * 校验排球表单数据
 */
export function validateVolleyballForm(data: unknown) {
  return VolleyballFormSchema.safeParse(data)
}

/**
 * 校验报告 JSON
 */
export function validateReportJSON(data: unknown) {
  return ReportJSONSchema.safeParse(data)
}

/**
 * 校验 API 请求
 */
export function validateAnalyzeRequest(data: unknown) {
  return AnalyzeRequestSchema.safeParse(data)
}

/**
 * 获取表单错误信息（用于前端展示）
 */
export function getFormErrors(result: ReturnType<typeof validateVolleyballForm>): string[] {
  if (result.success) return []
  
  return result.error.errors.map(err => {
    const path = err.path.join(".")
    return path ? `${path}: ${err.message}` : err.message
  })
}
