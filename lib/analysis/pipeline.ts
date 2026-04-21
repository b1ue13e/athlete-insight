import { ZodError } from "zod"
import type { ReportJSON, VolleyballFormData } from "@/types"
import { analyzeVolleyball } from "@/lib/mock-analysis"
import { getFormErrors, validateVolleyballForm } from "@/lib/schemas"
import {
  calculateGymScore,
  GOAL_TEMPLATES,
  GymSessionInputSchema,
  SESSION_TAG_TEMPLATES,
  SPLIT_TEMPLATES,
  type GymAnalysisResult,
  type GymSessionInput,
} from "@/lib/scoring/gym"
import {
  calculateRunningScore,
  labelGoalType,
  labelTrainingType,
  parseRunningSessionInput,
  type RunningScoreReport,
  type RunningSessionInput,
} from "@/lib/scoring/running"
import type {
  AnalysisEnvelope,
  AnalysisSport,
  CanonicalAnalysisReport,
  CanonicalConfidenceBand,
  CanonicalEvidenceItem,
  CanonicalFinding,
  CanonicalRiskSeverity,
  CanonicalScoreDimension,
  CanonicalTrendHook,
} from "./contracts"

export class AnalysisInputError extends Error {
  details?: string[]

  constructor(message: string, details?: string[]) {
    super(message)
    this.name = "AnalysisInputError"
    this.details = details
  }
}

function formatPace(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) {
    return undefined
  }

  const minutes = Math.floor(seconds / 60)
  const remain = Math.round(seconds % 60)
  return `${minutes}:${String(remain).padStart(2, "0")}/km`
}

function uniqueStrings(values: Array<string | undefined | null>, limit = 6) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())))).slice(0, limit)
}

function toConfidenceLabel(band: CanonicalConfidenceBand) {
  switch (band) {
    case "high":
      return "高"
    case "medium":
      return "中"
    default:
      return "低"
  }
}

function runningRangeLabel(range: RunningScoreReport["scoreBreakdown"]["final"]["range"]) {
  switch (range) {
    case "excellent":
      return "练对了"
    case "on_target":
      return "基本练对"
    case "mixed":
      return "有收获但练偏了"
    default:
      return "这次没练到点上"
  }
}

function gymRangeLabel(score: number) {
  if (score >= 85) return "练到点上"
  if (score >= 70) return "总体有效"
  if (score >= 55) return "有刺激但偏散"
  return "明显跑偏"
}

function volleyballRangeLabel(score: number) {
  if (score >= 85) return "表现扎实"
  if (score >= 70) return "整体可用"
  if (score >= 55) return "有亮点但不稳"
  return "需要重点纠偏"
}

function normalizeBand(value?: string | number): CanonicalConfidenceBand {
  if (typeof value === "number") {
    if (value >= 80) return "high"
    if (value >= 60) return "medium"
    return "low"
  }

  if (value === "高" || value === "high") return "high"
  if (value === "中" || value === "medium") return "medium"
  return "low"
}

function normalizeRiskSeverity(value: string | number | undefined): CanonicalRiskSeverity {
  if (typeof value === "number") {
    if (value >= 0.66) return "high"
    if (value >= 0.33) return "medium"
    return "low"
  }

  switch (value) {
    case "major":
    case "high":
      return "high"
    case "moderate":
    case "medium":
      return "medium"
    default:
      return "low"
  }
}

function toEvidenceItems(items: Array<{ label: string; detail: string; dimension?: string }>): CanonicalEvidenceItem[] {
  return items.map((item, index) => ({
    id: `${item.dimension ?? "evidence"}-${index}`,
    label: item.label,
    detail: item.detail,
    dimension: item.dimension,
  }))
}

function toTrendHooks(items: Array<{ id: string; label: string; value: string; note: string }>): CanonicalTrendHook[] {
  return items.filter((item) => item.note.trim().length > 0).slice(0, 4)
}

export function toCanonicalRunningReport(
  input: RunningSessionInput,
  report: RunningScoreReport
): CanonicalAnalysisReport {
  const dimensions: CanonicalScoreDimension[] = [
    {
      key: "completion",
      label: report.scoreBreakdown.completion.label,
      score: report.scoreBreakdown.completion.score,
      verdict: report.scoreBreakdown.completion.verdict,
      evidence: report.scoreBreakdown.completion.evidence,
    },
    {
      key: "pacingControl",
      label: report.scoreBreakdown.pacingControl.label,
      score: report.scoreBreakdown.pacingControl.score,
      verdict: report.scoreBreakdown.pacingControl.verdict,
      evidence: report.scoreBreakdown.pacingControl.evidence,
    },
    {
      key: "loadQuality",
      label: report.scoreBreakdown.loadQuality.label,
      score: report.scoreBreakdown.loadQuality.score,
      verdict: report.scoreBreakdown.loadQuality.verdict,
      evidence: report.scoreBreakdown.loadQuality.evidence,
    },
    {
      key: "goalValue",
      label: report.scoreBreakdown.goalValue.label,
      score: report.scoreBreakdown.goalValue.score,
      verdict: report.scoreBreakdown.goalValue.verdict,
      evidence: report.scoreBreakdown.goalValue.evidence,
    },
  ]

  const keyFindings: CanonicalFinding[] = [
    {
      id: "strongest-signal",
      title: report.strongestSignal.title,
      summary: report.strongestSignal.detail,
      evidence: dimensions.find((dimension) => dimension.key === report.strongestSignal.dimension)?.evidence.slice(0, 2) ?? [],
      tone: "positive",
      dimension: report.strongestSignal.dimension,
    },
    {
      id: "biggest-correction",
      title: report.biggestCorrection.title,
      summary: report.biggestCorrection.detail,
      evidence: dimensions.find((dimension) => dimension.key === report.biggestCorrection.dimension)?.evidence.slice(0, 2) ?? [],
      tone: "warning",
      dimension: report.biggestCorrection.dimension,
    },
  ]

  if (report.detectedDeviations[0]) {
    keyFindings.push({
      id: "primary-deviation",
      title: report.detectedDeviations[0].label,
      summary: report.detectedDeviations[0].summary,
      evidence: report.detectedDeviations[0].evidence.slice(0, 2),
      tone: "warning",
      dimension: report.detectedDeviations[0].dimension,
    })
  }

  const evidence = toEvidenceItems(
    uniqueStrings(
      [
        ...dimensions.flatMap((dimension) => dimension.evidence.map((detail) => `${dimension.label}｜${detail}`)),
        ...report.detectedDeviations.flatMap((deviation) => deviation.evidence.map((detail) => `${deviation.label}｜${detail}`)),
      ],
      8
    ).map((entry) => {
      const [label, detail] = entry.split("｜")
      return { label, detail }
    })
  )

  return {
    meta: {
      sport: "running",
      sessionId: report.sessionId,
      generatedAt: report.generatedAt,
      version: report.version,
      title: `${labelTrainingType(report.inputEcho.trainingType)}诊断`,
      sessionDate: input.date,
    },
    inputSummary: {
      headline: `${labelTrainingType(report.inputEcho.trainingType)} · ${input.distanceKm.toFixed(1)} km · ${Math.round(input.durationMin)} 分钟`,
      source: report.inputEcho.source,
      objective: report.inputEcho.goalType ? labelGoalType(report.inputEcho.goalType) : undefined,
      context: uniqueStrings(
        [
          formatPace(input.avgPaceSec) ? `平均配速 ${formatPace(input.avgPaceSec)}` : undefined,
          input.avgHeartRate ? `平均心率 ${input.avgHeartRate}` : undefined,
          input.rpe ? `主观强度 RPE ${input.rpe}` : undefined,
          input.plannedDistance || input.plannedDuration || input.plannedPaceRange ? "本次含计划值对照" : "本次没有计划值对照",
        ],
        4
      ),
    },
    scoreOverview: {
      finalScore: report.scoreBreakdown.final.score,
      rangeLabel: runningRangeLabel(report.scoreBreakdown.final.range),
      verdict: report.scoreBreakdown.final.verdict,
      dimensions,
    },
    keyFindings,
    evidence,
    riskFlags: report.detectedDeviations.map((deviation, index) => ({
      id: `${deviation.code}-${index}`,
      label: deviation.label,
      detail: deviation.summary,
      severity: normalizeRiskSeverity(deviation.severity),
      evidence: deviation.evidence,
    })),
    nextActions: report.nextSessionSuggestions.map((suggestion, index) => ({
      id: `action-${index}`,
      title: `下次动作 ${index + 1}`,
      detail: suggestion,
    })),
    confidence: {
      score: report.confidence.score,
      band: report.confidence.band,
      label: toConfidenceLabel(report.confidence.band),
      summary: report.confidence.reasons[0] ?? `当前结论可信度${toConfidenceLabel(report.confidence.band)}`,
      caveats: uniqueStrings([...report.confidence.reasons, ...report.confidence.missingData], 5),
    },
    trendHooks: toTrendHooks([
      {
        id: "final-score",
        label: "综合得分",
        value: String(report.scoreBreakdown.final.score),
        note: report.scoreBreakdown.final.verdict,
      },
      {
        id: "pacing-control",
        label: report.scoreBreakdown.pacingControl.label,
        value: String(report.scoreBreakdown.pacingControl.score),
        note: report.scoreBreakdown.pacingControl.evidence[0] ?? report.scoreBreakdown.pacingControl.verdict,
      },
      {
        id: "load-quality",
        label: report.scoreBreakdown.loadQuality.label,
        value: String(report.scoreBreakdown.loadQuality.score),
        note: report.scoreBreakdown.loadQuality.evidence[0] ?? report.scoreBreakdown.loadQuality.verdict,
      },
      {
        id: "goal-value",
        label: report.scoreBreakdown.goalValue.label,
        value: String(report.scoreBreakdown.goalValue.score),
        note: report.scoreBreakdown.goalValue.evidence[0] ?? report.scoreBreakdown.goalValue.verdict,
      },
    ]),
    sportSpecific: {
      inferredTrainingType: report.inferredTrainingType,
      advancedInsightsAvailable: report.advancedInsightsAvailable,
    },
  }
}

export function toCanonicalGymReport(
  input: GymSessionInput,
  report: GymAnalysisResult
): CanonicalAnalysisReport {
  const goal = GOAL_TEMPLATES[input.goalType]
  const split = SPLIT_TEMPLATES[input.splitType]
  const session = SESSION_TAG_TEMPLATES[input.sessionTag]

  const dimensions: CanonicalScoreDimension[] = [
    {
      key: "completion",
      label: "完成度",
      score: report.scoreBreakdown.completion.score,
      verdict: report.scoreBreakdown.completion.summary,
      evidence: report.scoreBreakdown.completion.evidence,
    },
    {
      key: "stimulusQuality",
      label: "刺激质量",
      score: report.scoreBreakdown.stimulusQuality.score,
      verdict: report.scoreBreakdown.stimulusQuality.summary,
      evidence: report.scoreBreakdown.stimulusQuality.evidence,
    },
    {
      key: "loadReasonableness",
      label: "负荷合理性",
      score: report.scoreBreakdown.loadReasonableness.score,
      verdict: report.scoreBreakdown.loadReasonableness.summary,
      evidence: report.scoreBreakdown.loadReasonableness.evidence,
    },
    {
      key: "goalAlignment",
      label: "目标匹配度",
      score: report.scoreBreakdown.goalAlignment.score,
      verdict: report.scoreBreakdown.goalAlignment.summary,
      evidence: report.scoreBreakdown.goalAlignment.evidence,
    },
  ]

  const keyFindings: CanonicalFinding[] = [
    {
      id: "strongest-signal",
      title: "这次最值得肯定",
      summary: report.strongestSignal,
      evidence: uniqueStrings(dimensions.flatMap((dimension) => dimension.evidence), 2),
      tone: "positive",
    },
    {
      id: "biggest-correction",
      title: "这次最该修正",
      summary: report.biggestCorrection,
      evidence: report.detectedDeviations[0]?.evidence.slice(0, 2) ?? uniqueStrings(dimensions.flatMap((dimension) => dimension.evidence), 2),
      tone: "warning",
    },
  ]

  if (report.detectedDeviations[0]) {
    keyFindings.push({
      id: "primary-deviation",
      title: report.detectedDeviations[0].code,
      summary: report.detectedDeviations[0].explanation,
      evidence: report.detectedDeviations[0].evidence,
      tone: "warning",
    })
  }

  const evidence = toEvidenceItems(
    uniqueStrings(
      [
        ...dimensions.flatMap((dimension) => dimension.evidence.map((detail) => `${dimension.label}｜${detail}`)),
        ...report.detectedDeviations.flatMap((deviation) => deviation.evidence.map((detail) => `偏差信号｜${detail}`)),
      ],
      8
    ).map((entry) => {
      const [label, detail] = entry.split("｜")
      return { label, detail }
    })
  )

  return {
    meta: {
      sport: "gym",
      sessionId: `${input.sessionDate}-${input.goalType}-${input.sessionTag}`,
      generatedAt: new Date().toISOString(),
      version: "gym-score-v1",
      title: `${goal.label}${session.label}训练诊断`,
      sessionDate: input.sessionDate,
    },
    inputSummary: {
      headline: `${goal.label} · ${session.label} · ${input.exercises.length} 个动作`,
      source: input.source,
      objective: goal.label,
      context: uniqueStrings(
        [
          `分化模板 ${split.label}`,
          `训练时长 ${input.durationMin} 分钟`,
          input.perceivedFatigue ? `主观疲劳 ${input.perceivedFatigue}/10` : undefined,
          input.sleepQuality ? `睡眠质量 ${input.sleepQuality}/10` : undefined,
        ],
        4
      ),
    },
    scoreOverview: {
      finalScore: report.finalGymScore,
      rangeLabel: gymRangeLabel(report.finalGymScore),
      verdict: report.biggestCorrection,
      dimensions,
    },
    keyFindings,
    evidence,
    riskFlags: report.detectedDeviations.map((deviation, index) => ({
      id: `${deviation.code}-${index}`,
      label: deviation.code,
      detail: deviation.explanation,
      severity: normalizeRiskSeverity(deviation.severity),
      evidence: deviation.evidence,
    })),
    nextActions: report.nextSessionSuggestions.map((suggestion, index) => ({
      id: `action-${index}`,
      title: suggestion.title,
      detail: suggestion.action,
      rationale: suggestion.rationale,
    })),
    confidence: {
      score: report.confidence.score,
      band: report.confidenceBand,
      label: toConfidenceLabel(report.confidenceBand),
      summary: report.confidence.confidenceReasons[0] ?? `当前结论可信度${toConfidenceLabel(report.confidenceBand)}`,
      caveats: report.confidence.confidenceReasons,
    },
    trendHooks: toTrendHooks([
      {
        id: "final-score",
        label: "综合得分",
        value: String(report.finalGymScore),
        note: report.strongestSignal,
      },
      {
        id: "completion",
        label: "完成度",
        value: String(report.scoreBreakdown.completion.score),
        note: report.scoreBreakdown.completion.evidence[0] ?? report.scoreBreakdown.completion.summary,
      },
      {
        id: "stimulus-quality",
        label: "刺激质量",
        value: String(report.scoreBreakdown.stimulusQuality.score),
        note: report.scoreBreakdown.stimulusQuality.evidence[0] ?? report.scoreBreakdown.stimulusQuality.summary,
      },
      {
        id: "focus",
        label: "推定训练焦点",
        value: report.inferredFocus[0] ?? goal.label,
        note: report.biggestCorrection,
      },
    ]),
    sportSpecific: {
      inferredFocus: report.inferredFocus,
      advancedInsightsAvailable: report.advancedInsightsAvailable,
    },
  }
}

export function toCanonicalVolleyballReport(
  input: VolleyballFormData,
  report: ReportJSON
): CanonicalAnalysisReport {
  const subScoreLabels: Record<string, string> = {
    scoring_contribution: "得分贡献",
    error_control: "失误控制",
    stability: "稳定性",
    clutch_performance: "关键分表现",
  }

  const dimensions: CanonicalScoreDimension[] = Object.entries(report.overview.sub_scores ?? {}).map(([key, value]) => ({
    key,
    label: subScoreLabels[key] ?? key,
    score: value,
    verdict: `${subScoreLabels[key] ?? key} ${value} 分`,
    evidence: [],
  }))

  const keyFindings: CanonicalFinding[] = [
    ...report.strengths.slice(0, 2).map((item, index) => ({
      id: `strength-${index}`,
      title: item.title,
      summary: item.detail,
      evidence: item.metric_refs ?? [],
      tone: "positive" as const,
    })),
    ...report.weaknesses.slice(0, 2).map((item, index) => ({
      id: `weakness-${index}`,
      title: item.title,
      summary: item.detail,
      evidence: item.metric_refs ?? [],
      tone: "warning" as const,
    })),
  ].slice(0, 4)

  const evidence = toEvidenceItems([
    ...report.root_causes.slice(0, 3).map((item, index) => ({
      label: `成因 ${index + 1}`,
      detail: `${item.cause}：${item.evidence}`,
    })),
    ...report.strengths.slice(0, 2).map((item) => ({ label: item.title, detail: item.detail })),
    ...report.weaknesses.slice(0, 2).map((item) => ({ label: item.title, detail: item.detail })),
  ])

  const confidenceBand = normalizeBand(report.overview.confidence_score ?? report.reliability_notes?.confidence_level)

  return {
    meta: {
      sport: "volleyball",
      sessionId: report.meta.session_id,
      generatedAt: report.meta.generated_at,
      version: report.meta.report_version,
      title: report.meta.title,
      sessionDate: report.meta.session_date,
    },
    inputSummary: {
      headline: `${input.match_name} · ${input.player_position}`,
      source: "manual",
      context: uniqueStrings([input.opponent ? `对手 ${input.opponent}` : undefined, `总得分 ${input.total_points}`, `总失分 ${input.total_points_lost}`], 4),
    },
    scoreOverview: {
      finalScore: report.overview.overall_score,
      rangeLabel: volleyballRangeLabel(report.overview.overall_score),
      verdict: report.overview.one_line_summary,
      dimensions,
    },
    keyFindings,
    evidence,
    riskFlags: report.weaknesses.slice(0, 3).map((item, index) => ({
      id: `risk-${index}`,
      label: item.title,
      detail: item.detail,
      severity: normalizeRiskSeverity(item.severity),
      evidence: item.metric_refs ?? [],
    })),
    nextActions: report.recommendations.map((item) => ({
      id: `recommendation-${item.priority}-${item.title}`,
      title: item.title,
      detail: item.detail,
    })),
    confidence: {
      score: report.overview.confidence_score,
      band: confidenceBand,
      label: toConfidenceLabel(confidenceBand),
      summary: report.reliability_notes?.confidence_level
        ? `数据完整度 ${report.reliability_notes.data_completeness}，当前结论可信度${report.reliability_notes.confidence_level}`
        : `当前结论可信度${toConfidenceLabel(confidenceBand)}`,
      caveats: uniqueStrings(
        [
          report.reliability_notes?.sample_size_note,
          report.reliability_notes?.scoring_engine_version ? `引擎版本 ${report.reliability_notes.scoring_engine_version}` : undefined,
        ],
        4
      ),
    },
    trendHooks: toTrendHooks([
      {
        id: "overall-score",
        label: "综合得分",
        value: String(report.overview.overall_score),
        note: report.overview.one_line_summary,
      },
      ...dimensions.map((dimension) => ({
        id: dimension.key,
        label: dimension.label,
        value: String(dimension.score),
        note: dimension.verdict,
      })),
    ]),
    sportSpecific: {
      tags: report.tags,
      positionAnalysis: report.overview.position_analysis,
    },
  }
}

export function analyzeRunningActivity(rawInput: unknown): AnalysisEnvelope<RunningSessionInput, RunningScoreReport> {
  try {
    const input = parseRunningSessionInput(rawInput)
    const report = calculateRunningScore(input)

    return {
      sport: "running",
      input,
      report,
      canonical: toCanonicalRunningReport(input, report),
    }
  } catch (error) {
    if (error instanceof AnalysisInputError) {
      throw error
    }
    if (error instanceof ZodError) {
      throw new AnalysisInputError("跑步输入不完整或格式有误。", error.errors.map((issue) => `${issue.path.join(".")}: ${issue.message}`))
    }
    throw error
  }
}

export function analyzeGymActivity(rawInput: unknown): AnalysisEnvelope<GymSessionInput, GymAnalysisResult> {
  const parsed = GymSessionInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    throw new AnalysisInputError(
      "健身输入不完整或格式有误。",
      parsed.error.errors.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    )
  }

  const report = calculateGymScore(parsed.data)
  return {
    sport: "gym",
    input: parsed.data,
    report,
    canonical: toCanonicalGymReport(parsed.data, report),
  }
}

export function analyzeVolleyballActivity(rawInput: unknown): AnalysisEnvelope<VolleyballFormData, ReportJSON> {
  const parsed = validateVolleyballForm(rawInput)
  if (!parsed.success) {
    throw new AnalysisInputError("排球输入不完整或格式有误。", getFormErrors(parsed))
  }

  const report = analyzeVolleyball(parsed.data)
  return {
    sport: "volleyball",
    input: parsed.data,
    report,
    canonical: toCanonicalVolleyballReport(parsed.data, report),
  }
}

export function analyzeActivity(request: { sport_type: string; data: unknown }) {
  switch (request.sport_type as AnalysisSport) {
    case "running":
      return analyzeRunningActivity(request.data)
    case "gym":
      return analyzeGymActivity(request.data)
    case "volleyball":
      return analyzeVolleyballActivity(request.data)
    default:
      throw new AnalysisInputError("当前运动类型还没有接入统一分析流程。")
  }
}
