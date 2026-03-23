/**
 * Volleyball Analysis Engine v2.0
 * 
 * 统一数据真相源规则：
 * - analysis_sessions.raw_input 是唯一真相源
 * - 所有分析都基于 raw_input
 * 
 * 分析流程：
 * 1. 输入数据校验
 * 2. 评估数据完整度
 * 3. 调用 Scoring Engine 计算4个子评分和总分
 * 4. 基于评分结果生成标签
 * 5. 生成 strengths / weaknesses / recommendations
 * 6. 记录评分引擎版本和调试信息
 * 7. 组装结构化报告
 */

import { 
  VolleyballFormData, 
  ReportJSON, 
  SportType,
  ReportItem,
  RootCauseItem,
  RecommendationItem,
  ChartItem
} from "@/types"
import { calculateVolleyballScore, positionTemplates, ScoringDetails } from "./scoring-engine"
import { 
  CURRENT_SCORING_VERSION, 
  versionToString,
  generateScoringMetadata,
  ScoringMetadata
} from "./scoring-version"

// 分析引擎版本
const ANALYSIS_ENGINE_VERSION = "2.0.0"

export interface AnalysisDebugInfo {
  engine_version: string
  scoring_version: string
  calculation_time_ms: number
  data_quality: {
    completeness: number
    missing_fields: string[]
    low_confidence_fields: string[]
    dimension_confidence: Record<string, number>
  }
  scoring_steps: {
    step: string
    input?: unknown
    output?: unknown
    formula?: string
  }[]
  intermediate_scores: Record<string, number>
}

export function analyzeVolleyball(
  data: VolleyballFormData,
  options?: { includeDebug?: boolean }
): ReportJSON {
  const startTime = Date.now()
  
  // Step 1: 计算评分
  const scoringResult = calculateVolleyballScore(data, { includeDebug: options?.includeDebug })
  
  // Step 2: 生成派生指标
  const derived = generateDerivedMetrics(data, scoringResult)
  
  // Step 3: 生成标签
  const tags = generateTags(data, scoringResult)
  
  // Step 4: 基于子评分生成 strengths / weaknesses
  const strengths = generateStrengths(data, scoringResult)
  const weaknesses = generateWeaknesses(data, scoringResult)
  
  // Step 5: 生成成因和建议
  const rootCauses = generateRootCauses(scoringResult, tags)
  const recommendations = generateRecommendations(scoringResult, tags)
  
  // Step 6: 生成一句话总结
  const oneLineSummary = generateSummary(scoringResult, strengths, weaknesses)
  
  // Step 7: 生成元数据
  const metadata = generateScoringMetadata(data.player_position, scoringResult.data_quality.completeness)
  
  const calculationTime = Date.now() - startTime
  
  // Step 8: 构建调试信息
  const debugInfo: AnalysisDebugInfo | undefined = options?.includeDebug ? {
    engine_version: ANALYSIS_ENGINE_VERSION,
    scoring_version: versionToString(CURRENT_SCORING_VERSION),
    calculation_time_ms: calculationTime,
    data_quality: {
      completeness: scoringResult.data_quality.completeness,
      missing_fields: scoringResult.data_quality.missingCriticalFields,
      low_confidence_fields: scoringResult.data_quality.lowConfidenceFields,
      dimension_confidence: scoringResult.data_quality.dimensionConfidence,
    },
    scoring_steps: scoringResult.debug_info?.calculationSteps.map(s => ({
      step: s.step,
      formula: s.formula,
    })) || [],
    intermediate_scores: scoringResult.debug_info?.intermediateScores || {},
  } : undefined

  return {
    meta: {
      sport_type: "volleyball" as SportType,
      session_id: crypto.randomUUID(),
      title: data.match_name,
      session_date: data.session_date,
      generated_at: new Date().toISOString(),
      report_version: ANALYSIS_ENGINE_VERSION,
      position_template: data.player_position,
      scoring_version: versionToString(CURRENT_SCORING_VERSION),
    },
    overview: {
      overall_score: scoringResult.overall_score,
      rating_label: getRatingLabel(scoringResult.overall_score),
      one_line_summary: oneLineSummary,
      sub_scores: scoringResult.sub_scores,
      position_analysis: positionTemplates[data.player_position].description,
      confidence_score: scoringResult.confidence_score,
    },
    strengths,
    weaknesses,
    root_causes: rootCauses,
    recommendations,
    metrics: {
      raw: {
        total_points: data.total_points,
        total_points_lost: data.total_points_lost,
        serve_aces: data.serve_aces,
        serve_errors: data.serve_errors,
        attack_kills: data.attack_kills,
        attack_errors: data.attack_errors,
        blocked_times: data.blocked_times,
        reception_success_rate: data.reception_success_rate,
        block_points: data.block_points,
        digs: data.digs,
        clutch_performance_score: data.clutch_performance_score,
      },
      derived,
      scoring_details: scoringResult.calculations,
    },
    charts: generateCharts(data, derived),
    tags,
    reliability_notes: {
      data_completeness: getCompletenessLabel(scoringResult.data_quality.completeness),
      sample_size_note: "单场数据，仅供参考",
      confidence_level: getConfidenceLabel(scoringResult.confidence_score),
      scoring_engine_version: versionToString(CURRENT_SCORING_VERSION),
      position_template_applied: data.player_position,
      calculation_time_ms: calculationTime,
    },
    _debug: debugInfo,
  } as ReportJSON
}

// ============ 辅助函数 ============

function getCompletenessLabel(completeness: number): string {
  if (completeness >= 0.9) return "高"
  if (completeness >= 0.7) return "中"
  return "低"
}

function getConfidenceLabel(score: number): string {
  if (score >= 80) return "高"
  if (score >= 60) return "中"
  return "低"
}

function getRatingLabel(score: number): string {
  if (score >= 90) return "优秀表现"
  if (score >= 80) return "良好表现"
  if (score >= 70) return "中上表现"
  if (score >= 60) return "及格表现"
  if (score >= 50) return "需改进"
  return "问题明显"
}

function generateDerivedMetrics(data: VolleyballFormData, scoring: ScoringDetails): Record<string, number> {
  const estimatedSets = Math.max(3, (data.total_points + data.total_points_lost) / 25)
  const attackAttempts = data.attack_kills + data.attack_errors + data.blocked_times
  const estimatedServes = Math.max(10, data.total_points / 3)
  
  return {
    attack_efficiency: attackAttempts > 0 ? Math.round((data.attack_kills / attackAttempts) * 100) : 0,
    attack_errors_per_set: Math.round((data.attack_errors / estimatedSets) * 10) / 10,
    serve_ace_rate: estimatedServes > 0 ? Math.round((data.serve_aces / estimatedServes) * 100) : 0,
    serve_error_rate: estimatedServes > 0 ? Math.round((data.serve_errors / estimatedServes) * 100) : 0,
    blocks_per_set: Math.round((data.block_points / estimatedSets) * 10) / 10,
    digs_per_set: Math.round((data.digs / estimatedSets) * 10) / 10,
    total_errors: data.serve_errors + data.attack_errors + data.blocked_times,
    errors_per_set: Math.round(((data.serve_errors + data.attack_errors + data.blocked_times) / estimatedSets) * 10) / 10,
    point_contribution_ratio: data.total_points_lost > 0 
      ? Math.round((data.total_points / data.total_points_lost) * 100) / 100 
      : data.total_points,
    scoring_contribution: scoring.sub_scores.scoring_contribution,
    error_control: scoring.sub_scores.error_control,
    stability: scoring.sub_scores.stability,
    clutch_performance: scoring.sub_scores.clutch_performance,
  }
}

function generateTags(data: VolleyballFormData, scoring: ScoringDetails): string[] {
  const tags: string[] = []
  
  // 基于子评分生成标签
  if (scoring.sub_scores.error_control < 60) tags.push("VB_ERROR_CONTROL_WEAK")
  if (scoring.sub_scores.stability < 60) tags.push("VB_STABILITY_ISSUE")
  if (scoring.sub_scores.clutch_performance < 60) tags.push("VB_CLUTCH_WEAK")
  if (scoring.sub_scores.scoring_contribution >= 75) tags.push("VB_SCORING_STRONG")
  
  // 基于具体指标
  const estimatedServes = Math.max(10, data.total_points / 3)
  if (data.serve_errors / estimatedServes > 0.3) tags.push("VB_SERVE_UNSTABLE")
  if (data.reception_success_rate < 65) tags.push("VB_RECEPTION_VOLATILE")
  if (data.clutch_performance_score < 60) tags.push("VB_CLUTCH_WEAK")
  
  const attackAttempts = data.attack_kills + data.attack_errors + data.blocked_times
  if (attackAttempts > 0 && data.attack_kills / attackAttempts > 0.65) tags.push("VB_ATTACK_EFFECTIVE")
  if (data.block_points >= 3) tags.push("VB_BLOCK_ACTIVE")
  if (data.digs >= 8) tags.push("VB_DEFENSE_SOLID")
  
  const totalErrors = data.serve_errors + data.attack_errors + data.blocked_times
  const estimatedSets = Math.max(3, (data.total_points + data.total_points_lost) / 25)
  if (totalErrors / estimatedSets > 3) tags.push("VB_ERROR_PRONE")
  
  return tags
}

function generateStrengths(data: VolleyballFormData, scoring: ScoringDetails): ReportItem[] {
  const strengths: ReportItem[] = []
  
  if (scoring.sub_scores.scoring_contribution >= 75) {
    const calc = scoring.calculations.scoring
    strengths.push({
      title: "得分贡献突出",
      detail: `进攻效率${calc.attack_efficiency}%，是球队重要的得分点。`,
      metric_refs: ["attack_efficiency", "attack_kills"],
    })
  }
  
  if (scoring.sub_scores.error_control >= 75) {
    strengths.push({
      title: "失误控制良好",
      detail: "技术动作稳定性高，非受迫性失误少，场上表现可靠。",
      metric_refs: ["error_control"],
    })
  }
  
  if (scoring.sub_scores.stability >= 75) {
    strengths.push({
      title: "场上表现稳定",
      detail: `一传到位率${data.reception_success_rate}%，基本功扎实。`,
      metric_refs: ["reception_success_rate", "stability"],
    })
  }
  
  if (scoring.sub_scores.clutch_performance >= 75) {
    strengths.push({
      title: "关键分把握能力强",
      detail: "局末关键球处理冷静，能在压力下稳定发挥。",
      metric_refs: ["clutch_performance_score"],
    })
  }
  
  if (data.block_points >= 3) {
    strengths.push({
      title: "网口防守积极",
      detail: `贡献${data.block_points}次拦网得分，网口压制力明显。`,
      metric_refs: ["block_points"],
    })
  }
  
  if (data.digs >= 8) {
    strengths.push({
      title: "防守投入度高",
      detail: `完成${data.digs}次有效救球，防守覆盖面积大。`,
      metric_refs: ["digs"],
    })
  }
  
  return strengths.slice(0, 3)
}

function generateWeaknesses(data: VolleyballFormData, scoring: ScoringDetails): ReportItem[] {
  const weaknesses: ReportItem[] = []
  
  if (scoring.sub_scores.error_control < 65) {
    const calc = scoring.calculations.error_control
    weaknesses.push({
      title: "失误控制需加强",
      detail: `发球失误率${calc.serve_error_rate}%，进攻失误率${calc.attack_error_rate}%，技术稳定性不足。`,
      severity: (65 - scoring.sub_scores.error_control) / 65,
      metric_refs: ["serve_errors", "attack_errors", "error_control"],
    })
  }
  
  if (scoring.sub_scores.stability < 65) {
    weaknesses.push({
      title: "场上稳定性不足",
      detail: `一传到位率${data.reception_success_rate}%，接发和常规技术动作波动较大。`,
      severity: (65 - scoring.sub_scores.stability) / 65,
      metric_refs: ["reception_success_rate", "stability"],
    })
  }
  
  if (scoring.sub_scores.clutch_performance < 65) {
    weaknesses.push({
      title: "关键分处理欠佳",
      detail: "局末关键球阶段表现下滑，高压下决策偏急。",
      severity: (65 - scoring.sub_scores.clutch_performance) / 65,
      metric_refs: ["clutch_performance_score"],
    })
  }
  
  if (scoring.sub_scores.scoring_contribution < 60 && data.player_position !== "自由人") {
    weaknesses.push({
      title: "得分贡献偏低",
      detail: "进攻端效率不足，需要提升终结能力。",
      severity: (60 - scoring.sub_scores.scoring_contribution) / 60,
      metric_refs: ["attack_kills", "attack_efficiency"],
    })
  }
  
  return weaknesses.slice(0, 3)
}

function generateRootCauses(scoring: ScoringDetails, tags: string[]): RootCauseItem[] {
  const causes: RootCauseItem[] = []
  
  if (scoring.sub_scores.error_control < 60 && scoring.sub_scores.stability < 60) {
    causes.push({
      cause: "基础技术动作不够扎实",
      evidence: "失误控制和稳定性两项评分均偏低，说明常规技术动作完成度波动较大，需要加强基本功训练。",
    })
  }
  
  if (scoring.sub_scores.clutch_performance < 60 && scoring.sub_scores.stability >= 70) {
    causes.push({
      cause: "心理素质和抗压能力需要提升",
      evidence: "常规表现稳定，但关键分明显下滑，说明问题不在技术而在心理层面。",
    })
  }
  
  if (scoring.sub_scores.scoring_contribution < 65 && scoring.sub_scores.error_control >= 70) {
    causes.push({
      cause: "进攻手段和变化不足",
      evidence: "失误控制良好但得分效率不高，说明进攻方式可能过于单一或保守。",
    })
  }
  
  if (causes.length === 0) {
    if (tags.includes("VB_ERROR_PRONE")) {
      causes.push({
        cause: "多项技术指标存在短板",
        evidence: "整体失误偏多，需要在训练中系统性地改善各环节。",
      })
    } else {
      causes.push({
        cause: "整体表现符合当前水平",
        evidence: "各项指标分布均衡，无明显技术短板，保持现有训练节奏即可。",
      })
    }
  }
  
  return causes.slice(0, 2)
}

function generateRecommendations(scoring: ScoringDetails, tags: string[]): RecommendationItem[] {
  const recommendations: RecommendationItem[] = []
  const subScores = scoring.sub_scores
  
  const sortedScores = [
    { name: "error_control", score: subScores.error_control, label: "失误控制" },
    { name: "stability", score: subScores.stability, label: "稳定性" },
    { name: "clutch_performance", score: subScores.clutch_performance, label: "关键分" },
    { name: "scoring_contribution", score: subScores.scoring_contribution, label: "得分贡献" },
  ].sort((a, b) => a.score - b.score)
  
  const lowest = sortedScores[0]
  
  if (lowest.name === "error_control") {
    recommendations.push({
      priority: 1,
      title: "夯实基本功，控制非受迫性失误",
      detail: "下一周重点练习发球落点控制和进攻线路选择，不求一击制胜，先把球打进去。建议每天专项练习30分钟基础动作。",
    })
  } else if (lowest.name === "stability") {
    recommendations.push({
      priority: 1,
      title: "提升一传稳定性和预判能力",
      detail: "增加接发球专项训练，重点提升对各种旋转和落点的适应能力。建议多观摩对手发球习惯，提升预判。",
    })
  } else if (lowest.name === "clutch_performance") {
    recommendations.push({
      priority: 1,
      title: "加强关键分心理素质训练",
      detail: "设置23:23、24:24等局末压力场景进行模拟训练，培养高压下的冷静决策能力。建议每周2次压力情境练习。",
    })
  } else if (lowest.name === "scoring_contribution") {
    recommendations.push({
      priority: 1,
      title: "丰富进攻手段，提升终结能力",
      detail: "在保持当前稳定性的基础上，尝试更多进攻线路和节奏变化。建议加强弹跳和挥臂速度训练。",
    })
  }
  
  if (sortedScores[1].score < 70) {
    recommendations.push({
      priority: 2,
      title: `改善${sortedScores[1].label}`,
      detail: `在解决首要问题的同时，逐步提升${sortedScores[1].label}水平。`,
    })
  }
  
  const highest = sortedScores[sortedScores.length - 1]
  if (highest.score >= 75) {
    recommendations.push({
      priority: recommendations.length + 1,
      title: `保持${highest.label}优势`,
      detail: `继续发挥${highest.label}方面的优势，将其作为球队的核心竞争力。`,
    })
  }
  
  return recommendations.slice(0, 3)
}

function generateSummary(scoring: ScoringDetails, strengths: ReportItem[], weaknesses: ReportItem[]): string {
  const { overall_score, sub_scores } = scoring
  
  // 考虑数据质量生成总结
  if (scoring.confidence_score < 50) {
    return "数据完整度较低，当前评分仅供参考，建议补充更多比赛数据后重新分析。"
  }
  
  const highScores = Object.values(sub_scores).filter(s => s >= 75).length
  const lowScores = Object.values(sub_scores).filter(s => s < 65).length
  
  if (overall_score >= 85) {
    if (highScores >= 3) return "整体表现优秀，多项技术指标处于高水平，是球队的核心支柱。"
    return "整体表现优秀，个别环节仍有提升空间，建议保持现有训练强度。"
  }
  
  if (overall_score >= 70) {
    if (lowScores >= 2) return `表现有亮点但也有明显短板，${weaknesses[0]?.title.replace("需加强", "").replace("欠佳", "")}需要重点关注。`
    if (highScores >= 2) return "多项技术指标表现良好，继续保持训练节奏，争取突破瓶颈。"
    return "整体表现中规中矩，各项指标较为均衡，建议在优势环节寻求突破。"
  }
  
  if (overall_score >= 60) {
    return `表现有亮点但也有明显短板，${weaknesses[0]?.title.replace("需加强", "").replace("欠佳", "")}需要针对性改进。`
  }
  
  return "整体表现低于预期，多项技术指标需要系统性改进，建议调整训练重点。"
}

function generateCharts(data: VolleyballFormData, derived: Record<string, number>): ChartItem[] {
  return [
    {
      chart_type: "bar",
      chart_key: "sub_scores",
      title: "四维评分",
      data: [
        { name: "得分贡献", value: derived.scoring_contribution },
        { name: "失误控制", value: derived.error_control },
        { name: "稳定性", value: derived.stability },
        { name: "关键分", value: derived.clutch_performance },
      ],
    },
    {
      chart_type: "bar",
      chart_key: "point_breakdown",
      title: "得失分构成",
      data: [
        { name: "得分", value: data.total_points },
        { name: "丢分", value: data.total_points_lost },
      ],
    },
    {
      chart_type: "bar",
      chart_key: "attack_breakdown",
      title: "进攻表现",
      data: [
        { name: "扣球得分", value: data.attack_kills },
        { name: "扣球失误", value: data.attack_errors },
        { name: "被拦", value: data.blocked_times },
      ],
    },
    {
      chart_type: "bar",
      chart_key: "error_distribution",
      title: "失误分布",
      data: [
        { name: "发球失误", value: data.serve_errors },
        { name: "扣球失误", value: data.attack_errors },
        { name: "被拦", value: data.blocked_times },
      ],
    },
  ]
}

// 调试信息类型已在上方导出
