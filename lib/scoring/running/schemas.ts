import { z } from "zod"

export const RUNNING_TRAINING_TYPES = [
  "easy",
  "recovery",
  "tempo",
  "interval",
  "long",
  "race",
] as const

export const RUNNING_GOAL_TYPES = [
  "5k",
  "10k",
  "half",
  "marathon",
  "fatloss",
  "test",
] as const

export const RUNNING_SOURCES = ["manual", "watch", "imported"] as const
export const SCORE_RANGES = ["excellent", "on_target", "mixed", "off_target"] as const
export const CONFIDENCE_BANDS = ["high", "medium", "low"] as const

export const RunningTrainingTypeSchema = z.enum(RUNNING_TRAINING_TYPES)
export const RunningGoalTypeSchema = z.enum(RUNNING_GOAL_TYPES)
export const RunningSourceSchema = z.enum(RUNNING_SOURCES)
export const ScoreRangeSchema = z.enum(SCORE_RANGES)
export const ConfidenceBandSchema = z.enum(CONFIDENCE_BANDS)

export const PlannedPaceRangeSchema = z
  .object({
    minSec: z.number().positive().max(2400),
    maxSec: z.number().positive().max(2400),
  })
  .refine((value) => value.minSec <= value.maxSec, {
    message: "plannedPaceRange.minSec must be <= plannedPaceRange.maxSec",
    path: ["maxSec"],
  })

export const PlannedHeartRateRangeSchema = z
  .object({
    min: z.number().int().min(40).max(230),
    max: z.number().int().min(40).max(230),
  })
  .refine((value) => value.min <= value.max, {
    message: "plannedHeartRateRange.min must be <= plannedHeartRateRange.max",
    path: ["max"],
  })

export const RunningTelemetryPointSchema = z.object({
  timestampSec: z.number().nonnegative(),
  distanceKm: z.number().nonnegative(),
  paceSec: z.number().positive().max(2400),
  heartRate: z.number().int().min(40).max(230).optional(),
  cadence: z.number().positive().max(260).optional(),
  groundContactTimeMs: z.number().positive().max(600).optional(),
  verticalOscillationCm: z.number().positive().max(30).optional(),
  strideLengthM: z.number().positive().max(5).optional(),
})

export const RunningSessionInputSchema = z
  .object({
    id: z.string().min(1),
    date: z.string().min(1),
    athleteId: z.string().min(1).optional(),
    trainingType: RunningTrainingTypeSchema,
    goalType: RunningGoalTypeSchema.optional(),
    durationMin: z.number().positive().max(600),
    distanceKm: z.number().positive().max(300),
    avgPaceSec: z.number().positive().max(2400).optional(),
    splits: z.array(z.number().positive().max(2400)).min(1).optional(),
    avgHeartRate: z.number().int().min(40).max(230).optional(),
    maxHeartRate: z.number().int().min(60).max(240).optional(),
    heartRateSeries: z.array(z.number().int().min(40).max(230)).min(3).optional(),
    rpe: z.number().min(1).max(10).optional(),
    feeling: z.enum(["easy", "good", "hard", "exhausted"]).optional(),
    plannedDistance: z.number().positive().max(300).optional(),
    plannedDuration: z.number().positive().max(600).optional(),
    plannedPaceRange: PlannedPaceRangeSchema.optional(),
    plannedHeartRateRange: PlannedHeartRateRangeSchema.optional(),
    source: RunningSourceSchema,
    notes: z.string().max(1000).optional(),
    telemetry: z.array(RunningTelemetryPointSchema).min(3).optional(),
  })
  .superRefine((value, context) => {
    if (value.avgPaceSec === undefined && (!value.splits || value.splits.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["avgPaceSec"],
        message: "Either avgPaceSec or splits is required",
      })
    }

    if (value.avgHeartRate !== undefined && value.maxHeartRate !== undefined && value.avgHeartRate > value.maxHeartRate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["avgHeartRate"],
        message: "avgHeartRate cannot be higher than maxHeartRate",
      })
    }
  })

export type RunningTrainingType = z.infer<typeof RunningTrainingTypeSchema>
export type RunningGoalType = z.infer<typeof RunningGoalTypeSchema>
export type RunningSource = z.infer<typeof RunningSourceSchema>
export type ScoreRange = z.infer<typeof ScoreRangeSchema>
export type ConfidenceBand = z.infer<typeof ConfidenceBandSchema>
export type RunningTelemetryPoint = z.infer<typeof RunningTelemetryPointSchema>
export type RunningSessionInput = z.infer<typeof RunningSessionInputSchema>

export type RunningDimensionKey =
  | "completion"
  | "pacingControl"
  | "loadQuality"
  | "goalValue"

export type RunningDeviationCode =
  | "easy_gray_zone"
  | "tempo_front_loaded"
  | "interval_late_loss"
  | "long_run_fade"
  | "plan_under_completed"
  | "overload_under_recovered"
  | "missing_key_data"
  | "recovery_not_easy"
  | "goal_mismatch"

export interface RunningDerivedMetrics {
  avgPaceSec: number
  splitCount: number
  paceVariancePct: number
  firstHalfPaceSec?: number
  secondHalfPaceSec?: number
  lateSegmentPaceSec?: number
  slowdownPct?: number
  avgHeartRatePctMax?: number
  distanceCompletionPct?: number
  durationCompletionPct?: number
  paceTargetHit?: boolean
  heartRateTargetHit?: boolean
  cadenceDropPct?: number
  groundContactIncreaseMs?: number
  telemetryPointCount: number
}

export interface RunningScoreDimension {
  label: string
  score: number
  range: ScoreRange
  confidenceBand: ConfidenceBand
  verdict: string
  evidence: string[]
}

export type CompletionScore = RunningScoreDimension
export type PacingControlScore = RunningScoreDimension
export type LoadQualityScore = RunningScoreDimension
export type GoalValueScore = RunningScoreDimension
export type FinalRunningScore = RunningScoreDimension & {
  weightedScore: number
  onTarget: boolean
}

export interface RunningDeviation {
  code: RunningDeviationCode
  label: string
  severity: "minor" | "moderate" | "major"
  dimension: RunningDimensionKey
  summary: string
  evidence: string[]
  action: string
}

export interface RunningReportSignal {
  title: string
  detail: string
  dimension: RunningDimensionKey
  direction: "positive" | "negative"
}

export interface RunningTrainingInference {
  input: RunningTrainingType
  inferred: RunningTrainingType
  matchesInput: boolean
  confidence: number
  rationale: string[]
}

export interface RunningConfidence {
  score: number
  band: ConfidenceBand
  reasons: string[]
  missingData: string[]
}

export interface RunningScoreReport {
  version: string
  sessionId: string
  generatedAt: string
  inputEcho: {
    trainingType: RunningTrainingType
    goalType?: RunningGoalType
    source: RunningSource
  }
  inferredTrainingType: RunningTrainingInference
  scoreBreakdown: {
    completion: CompletionScore
    pacingControl: PacingControlScore
    loadQuality: LoadQualityScore
    goalValue: GoalValueScore
    final: FinalRunningScore
  }
  detectedDeviations: RunningDeviation[]
  strongestSignal: RunningReportSignal
  biggestCorrection: RunningReportSignal
  confidence: RunningConfidence
  advancedInsightsAvailable: boolean
  nextSessionSuggestions: string[]
}

export interface WeeklyTrainingSessionSummary {
  input: RunningSessionInput
  report: RunningScoreReport
}

export interface WeeklyTrainingBlock {
  weekStart: string
  weekEnd: string
  sessions: WeeklyTrainingSessionSummary[]
  totals: {
    totalDistanceKm: number
    totalDurationMin: number
    sessionsCount: number
    restDays: number
  }
  structure: {
    easySharePct: number
    qualitySharePct: number
    longRunCompleted: boolean
    intensityBalance: "balanced" | "too_much_intensity" | "too_little_intensity" | "missing_long_run" | "monotonous"
  }
  scoreSummary: {
    averageFinalScore: number
    averageCompletion: number
    averagePacingControl: number
    averageLoadQuality: number
    averageGoalValue: number
  }
  findings: {
    blockVerdict: string
    strongestWeekSignal: string
    biggestWeekCorrection: string
    detectedPatterns: string[]
  }
  nextWeekFocus: string[]
  confidence: RunningConfidence
}

export interface WeeklyComparison {
  current: WeeklyTrainingBlock
  previous: WeeklyTrainingBlock | null
  changes: {
    distanceChangePct: number
    durationChangePct: number
    scoreChange: number
  }
  insights: string[]
}

export function parseRunningSessionInput(input: unknown): RunningSessionInput {
  return RunningSessionInputSchema.parse(input)
}

export function toScoreRange(score: number): ScoreRange {
  if (score >= 85) return "excellent"
  if (score >= 70) return "on_target"
  if (score >= 55) return "mixed"
  return "off_target"
}

export function toConfidenceBand(score: number): ConfidenceBand {
  if (score >= 80) return "high"
  if (score >= 60) return "medium"
  return "low"
}
