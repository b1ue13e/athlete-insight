import { z } from "zod"

export const GymGoalTypeSchema = z.enum([
  "hypertrophy",
  "strength",
  "fat_loss",
  "recomposition",
  "physique",
  "beginner_adaptation",
])

export const GymSplitTypeSchema = z.enum([
  "full_body",
  "upper_lower",
  "ppl",
  "bro_split",
  "strength_split",
  "custom",
])

export const GymSessionTagSchema = z.enum([
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full_body",
  "conditioning",
  "accessory",
  "recovery",
])

export const MovementPatternSchema = z.enum([
  "squat",
  "hinge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "lunge",
  "carry",
  "isolation",
  "core",
  "conditioning",
])

export const MuscleGroupSchema = z.enum([
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "lats",
  "upper_back",
  "traps",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "obliques",
  "spinal_erectors",
  "full_body",
])

export const EquipmentSchema = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "sled",
  "cardio_machine",
  "other",
])

export const CompoundOrIsolationSchema = z.enum(["compound", "isolation"])

export const GymSourceSchema = z.enum(["manual", "imported"])

export const DeviationSeveritySchema = z.enum(["low", "medium", "high"])

export const GymDeviationCodeSchema = z.enum([
  "chest_front_delts_overload",
  "back_volume_insufficient",
  "leg_training_avoidance",
  "push_pull_imbalance",
  "too_many_isolation_movements",
  "compound_lift_missing",
  "effective_sets_insufficient",
  "excessive_fatigue_risk",
  "intensity_too_low_for_strength",
  "volume_too_low_for_hypertrophy",
  "accessory_over_main_lift",
  "repeated_same_muscle_overload",
  "poor_goal_alignment",
  "incomplete_session_execution",
])

const NumericArraySchema = z.array(z.number())

export const ExerciseSetEntrySchema = z.object({
  exerciseName: z.string().min(1),
  movementPattern: MovementPatternSchema,
  primaryMuscles: z.array(MuscleGroupSchema).min(1),
  equipment: EquipmentSchema,
  compoundOrIsolation: CompoundOrIsolationSchema,
  sets: z.number().int().min(1).max(20),
  repsPerSet: NumericArraySchema.min(1),
  loadPerSet: NumericArraySchema.min(1).optional(),
  rpePerSet: NumericArraySchema.min(1).optional(),
  rirPerSet: NumericArraySchema.min(1).optional(),
  restSec: z.union([z.number().int().min(0).max(1200), NumericArraySchema.min(1)]).optional(),
  unilateral: z.boolean().optional(),
}).superRefine((value, ctx) => {
  const checkPerSetArray = (
    field: "repsPerSet" | "loadPerSet" | "rpePerSet" | "rirPerSet",
    max?: number,
  ) => {
    const current = value[field]
    if (!current) {
      return
    }

    if (current.length !== value.sets && current.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} length must equal sets or provide one fallback value.`,
      })
    }

    if (max !== undefined && current.some((entry) => entry > max)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} contains values above the supported ceiling.`,
      })
    }
  }

  checkPerSetArray("repsPerSet", 100)
  checkPerSetArray("loadPerSet", 1000)
  checkPerSetArray("rpePerSet", 10)
  checkPerSetArray("rirPerSet", 8)

  if (value.restSec && Array.isArray(value.restSec) && value.restSec.length !== value.sets && value.restSec.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["restSec"],
      message: "restSec length must equal sets or provide one fallback value.",
    })
  }
})

export const PlannedExerciseSchema = z.object({
  exerciseName: z.string().min(1),
  movementPattern: MovementPatternSchema.optional(),
  primaryMuscles: z.array(MuscleGroupSchema).min(1).optional(),
  targetSets: z.number().int().min(1).max(20).optional(),
  targetRepRange: z.tuple([z.number().min(1), z.number().min(1)]).optional(),
  required: z.boolean().default(false),
  priority: z.enum(["main", "secondary", "accessory"]).default("secondary"),
})

export const PlannedGymSessionSchema = z.object({
  durationMin: z.number().int().min(10).max(240).optional(),
  exerciseOrder: z.array(z.string().min(1)).optional(),
  exercises: z.array(PlannedExerciseSchema).min(1).optional(),
})

export const GymSessionInputSchema = z.object({
  sport: z.literal("gym"),
  goalType: GymGoalTypeSchema,
  splitType: GymSplitTypeSchema,
  sessionTag: GymSessionTagSchema,
  sessionDate: z.string().min(1),
  durationMin: z.number().int().min(10).max(300),
  exercises: z.array(ExerciseSetEntrySchema).min(1),
  plannedSession: PlannedGymSessionSchema.optional(),
  perceivedFatigue: z.number().min(1).max(10).optional(),
  soreness: z.number().min(1).max(10).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  source: GymSourceSchema,
})

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"])
export const ScoreStatusSchema = z.enum(["excellent", "good", "fair", "poor"])

export const GymNextSessionSuggestionSchema = z.object({
  title: z.string(),
  action: z.string(),
  rationale: z.string(),
  source: z.enum(["deviation", "coverage", "load", "goal_alignment", "recovery"]),
})

export const GymDeviationSchema = z.object({
  code: GymDeviationCodeSchema,
  severity: DeviationSeveritySchema,
  explanation: z.string(),
  evidence: z.array(z.string()).min(1),
  suggestedFix: z.string(),
})

export const GymScoreDimensionSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  status: ScoreStatusSchema,
  summary: z.string(),
  evidence: z.array(z.string()),
})

export const GymConfidenceSchema = z.object({
  score: z.number().min(0).max(100),
  confidenceLevel: ConfidenceLevelSchema,
  confidenceReasons: z.array(z.string()),
})

export const MuscleGroupSummaryItemSchema = z.object({
  muscleGroup: MuscleGroupSchema,
  effectiveSets: z.number().min(0),
  totalSets: z.number().min(0),
  emphasis: z.enum(["high", "moderate", "low", "none"]),
})

export const MovementPatternCoverageItemSchema = z.object({
  movementPattern: MovementPatternSchema,
  exerciseCount: z.number().int().min(0),
  totalSets: z.number().min(0),
  covered: z.boolean(),
})

export const GymAdvancedInsightSchema = z.object({
  key: z.string(),
  label: z.string(),
  advanced: z.literal(true),
  experimental: z.boolean().default(false),
  evidenceLevel: z.enum(["strong", "moderate", "weak"]),
  requiredFields: z.array(z.string()),
  failureReason: z.string().optional(),
  data: z.record(z.any()).optional(),
})

export const GymAnalysisResultSchema = z.object({
  inferredFocus: z.array(z.string()).min(1),
  scoreBreakdown: z.object({
    completion: GymScoreDimensionSchema,
    stimulusQuality: GymScoreDimensionSchema,
    loadReasonableness: GymScoreDimensionSchema,
    goalAlignment: GymScoreDimensionSchema,
  }),
  finalGymScore: z.number().min(0).max(100),
  finalScore: z.number().min(0).max(100),
  scoreRange: z.object({
    lower: z.number().min(0).max(100),
    upper: z.number().min(0).max(100),
  }),
  confidenceBand: ConfidenceLevelSchema,
  confidence: GymConfidenceSchema,
  detectedDeviations: z.array(GymDeviationSchema),
  strongestSignal: z.string(),
  biggestCorrection: z.string(),
  muscleGroupSummary: z.array(MuscleGroupSummaryItemSchema),
  movementPatternCoverage: z.array(MovementPatternCoverageItemSchema),
  nextSessionSuggestions: z.array(GymNextSessionSuggestionSchema),
  advancedInsightsAvailable: z.boolean(),
  advancedInsights: z.array(GymAdvancedInsightSchema).optional(),
})

export const GymWeeklyAnalysisResultSchema = z.object({
  totalSessions: z.number().int().min(0),
  totalDuration: z.number().min(0),
  muscleGroupWeeklySets: z.record(z.number()),
  movementPatternDistribution: z.record(z.number()),
  pushPullBalance: z.object({
    ratio: z.number(),
    label: z.string(),
  }),
  upperLowerBalance: z.object({
    ratio: z.number(),
    label: z.string(),
  }),
  estimatedRecoveryPressure: z.enum(["low", "medium", "high"]),
  skippedPlannedSessions: z.number().int().min(0),
  weeklyStructureAssessment: z.string(),
  keyImbalanceFlags: z.array(z.string()),
  nextWeekAdvice: z.array(z.string()),
})

export const GymMesocycleAnalysisResultSchema = z.object({
  weekCount: z.number().int().min(0),
  mainLiftTrends: z.array(z.object({
    exerciseName: z.string(),
    trend: z.enum(["up", "flat", "down"]),
    changePercent: z.number(),
  })),
  trainingVolumeTrend: z.object({
    direction: z.enum(["up", "flat", "down"]),
    weeklyEffectiveSets: z.array(z.number()),
  }),
  recoveryPressureTrend: z.object({
    direction: z.enum(["up", "flat", "down"]),
    weeklyPressure: z.array(z.enum(["low", "medium", "high"])),
  }),
  planExecutionTrend: z.object({
    direction: z.enum(["up", "flat", "down"]),
    weeklyCompletion: z.array(z.number()),
  }),
  needsDeload: z.boolean(),
  deloadReason: z.string().optional(),
  mostSkippedSessionTags: z.array(z.string()),
  mostUnderdosedMuscles: z.array(z.string()),
})

export type GymGoalType = z.infer<typeof GymGoalTypeSchema>
export type GymSplitType = z.infer<typeof GymSplitTypeSchema>
export type GymSessionTag = z.infer<typeof GymSessionTagSchema>
export type MovementPattern = z.infer<typeof MovementPatternSchema>
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>
export type Equipment = z.infer<typeof EquipmentSchema>
export type CompoundOrIsolation = z.infer<typeof CompoundOrIsolationSchema>
export type GymSource = z.infer<typeof GymSourceSchema>
export type ExerciseSetEntry = z.infer<typeof ExerciseSetEntrySchema>
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>
export type PlannedGymSession = z.infer<typeof PlannedGymSessionSchema>
export type GymSessionInput = z.infer<typeof GymSessionInputSchema>
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>
export type DeviationSeverity = z.infer<typeof DeviationSeveritySchema>
export type GymDeviationCode = z.infer<typeof GymDeviationCodeSchema>
export type GymDeviation = z.infer<typeof GymDeviationSchema>
export type GymScoreDimension = z.infer<typeof GymScoreDimensionSchema>
export type GymConfidence = z.infer<typeof GymConfidenceSchema>
export type MuscleGroupSummaryItem = z.infer<typeof MuscleGroupSummaryItemSchema>
export type MovementPatternCoverageItem = z.infer<typeof MovementPatternCoverageItemSchema>
export type GymNextSessionSuggestion = z.infer<typeof GymNextSessionSuggestionSchema>
export type GymAdvancedInsight = z.infer<typeof GymAdvancedInsightSchema>
export type GymAnalysisResult = z.infer<typeof GymAnalysisResultSchema>
export type GymWeeklyAnalysisResult = z.infer<typeof GymWeeklyAnalysisResultSchema>
export type GymMesocycleAnalysisResult = z.infer<typeof GymMesocycleAnalysisResultSchema>

export function expandPerSetValues(values: number[] | undefined, sets: number): number[] | undefined {
  if (!values) {
    return undefined
  }

  if (values.length === sets) {
    return values
  }

  if (values.length === 1) {
    return Array.from({ length: sets }, () => values[0])
  }

  return values.slice(0, sets)
}

export function expandRestValues(values: number | number[] | undefined, sets: number): number[] {
  if (values === undefined) {
    return []
  }

  if (typeof values === "number") {
    return Array.from({ length: sets }, () => values)
  }

  if (values.length === sets) {
    return values
  }

  if (values.length === 1) {
    return Array.from({ length: sets }, () => values[0])
  }

  return values.slice(0, sets)
}
