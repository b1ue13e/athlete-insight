import { estimateFatigueSignals } from "./advanced/fatigue-signals"
import { estimateStrengthMetrics } from "./advanced/strength-metrics"
import { estimateVolumeLandmarks } from "./advanced/volume-landmarks"
import { calculateGymConfidence } from "./confidence"
import { getMainLiftBias, normalizeExerciseName } from "./exercise-library"
import type {
  ExerciseSetEntry,
  GymAnalysisResult,
  GymConfidence,
  GymDeviation,
  GymNextSessionSuggestion,
  GymScoreDimension,
  GymSessionInput,
  MovementPattern,
  MuscleGroup,
} from "./schemas"
import { expandPerSetValues, expandRestValues } from "./schemas"
import { getGymTemplateContext, type GymTemplateContext } from "./templates"

const DIMENSION_WEIGHT = 0.25

const MOVEMENT_PATTERNS: MovementPattern[] = [
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
]

const MUSCLE_GROUPS: MuscleGroup[] = [
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
]

export interface GymSessionMetrics {
  effectiveSets: number
  totalSets: number
  totalTonnage: number
  compoundEffectiveSets: number
  isolationEffectiveSets: number
  mainLiftWeightedSets: number
  lowerBodyEffectiveSets: number
  upperBodyEffectiveSets: number
  pushEffectiveSets: number
  pullEffectiveSets: number
  lowQualitySetShare: number
  heavyStrengthSets: number
  nearFailureSets: number
  exerciseCount: number
  compoundExerciseCount: number
  isolationExerciseCount: number
  averageReps: number
  averageRpe?: number
  averageRir?: number
  averageRestSec?: number
  patternEffectiveSets: Record<MovementPattern, number>
  patternExerciseCount: Record<MovementPattern, number>
  muscleEffectiveSets: Record<MuscleGroup, number>
  muscleTotalSets: Record<MuscleGroup, number>
  muscleExerciseCount: Record<MuscleGroup, number>
  focusMuscleCoverage: number
  requiredPatternCoverage: number
  plannedSetCompletion?: number
  requiredExerciseCompletion?: number
  durationCompletion?: number
  orderDeviation: boolean
  incompleteFlag: boolean
}

export interface GymSessionSnapshot {
  input: GymSessionInput
  context: GymTemplateContext
  metrics: GymSessionMetrics
  confidence: GymConfidence
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function createMovementRecord(): Record<MovementPattern, number> {
  return MOVEMENT_PATTERNS.reduce((accumulator, pattern) => {
    accumulator[pattern] = 0
    return accumulator
  }, {} as Record<MovementPattern, number>)
}

function createMuscleRecord(): Record<MuscleGroup, number> {
  return MUSCLE_GROUPS.reduce((accumulator, muscle) => {
    accumulator[muscle] = 0
    return accumulator
  }, {} as Record<MuscleGroup, number>)
}

function getEffectiveSetFactor(reps: number, rpe?: number, rir?: number): number {
  if (rir !== undefined) {
    if (rir <= 1) return 1
    if (rir <= 2) return 0.95
    if (rir <= 3) return 0.85
    if (rir <= 4) return 0.6
    if (rir <= 5) return 0.35
    return 0.15
  }

  if (rpe !== undefined) {
    if (rpe >= 9) return 1
    if (rpe >= 8) return 0.9
    if (rpe >= 7) return 0.75
    if (rpe >= 6) return 0.5
    return 0.25
  }

  if (reps >= 5 && reps <= 20) return 0.65
  if (reps <= 4) return 0.55
  return 0.45
}

function getEffectiveSetTarget(context: GymTemplateContext): [number, number] {
  const lower = Math.round((context.goal.targetEffectiveSetsRange[0] + context.session.targetEffectiveSetsRange[0]) / 2)
  const upper = Math.round((context.goal.targetEffectiveSetsRange[1] + context.session.targetEffectiveSetsRange[1]) / 2)

  if (context.session.label === "恢复") {
    return [2, 6]
  }

  return [lower, upper]
}

function calculateRangeFitScore(value: number, [lower, upper]: [number, number]): number {
  if (value >= lower && value <= upper) {
    return 100
  }

  if (value < lower) {
    return clamp(100 - ((lower - value) / Math.max(lower, 1)) * 100, 20, 100)
  }

  return clamp(100 - ((value - upper) / Math.max(upper, 1)) * 60, 35, 100)
}

function hasLowerBodyPattern(exercise: ExerciseSetEntry): boolean {
  return ["squat", "hinge", "lunge"].includes(exercise.movementPattern)
}

function hasPushPattern(exercise: ExerciseSetEntry): boolean {
  return ["horizontal_push", "vertical_push"].includes(exercise.movementPattern)
}

function hasPullPattern(exercise: ExerciseSetEntry): boolean {
  return ["horizontal_pull", "vertical_pull"].includes(exercise.movementPattern)
}

function computePlannedMetrics(input: GymSessionInput, context: GymTemplateContext, metrics: GymSessionMetrics) {
  const plannedExercises = input.plannedSession?.exercises ?? []
  const requiredExercises = plannedExercises.filter((exercise) => exercise.required)
  const normalizedActualNames = input.exercises.map((exercise) => normalizeExerciseName(exercise.exerciseName))

  let requiredExerciseCompletion: number | undefined
  if (requiredExercises.length > 0) {
    const completed = requiredExercises.filter((exercise) => {
      const normalizedPlanned = normalizeExerciseName(exercise.exerciseName)
      return normalizedActualNames.includes(normalizedPlanned)
    }).length

    requiredExerciseCompletion = completed / requiredExercises.length
  }

  let plannedSetCompletion: number | undefined
  const plannedSetRatios = plannedExercises
    .filter((exercise) => exercise.targetSets)
    .map((exercise) => {
      const match = input.exercises.find((actual) => normalizeExerciseName(actual.exerciseName) === normalizeExerciseName(exercise.exerciseName))
      if (!match || !exercise.targetSets) {
        return 0
      }

      return clamp(match.sets / exercise.targetSets, 0, 1.2)
    })

  if (plannedSetRatios.length > 0) {
    plannedSetCompletion = average(plannedSetRatios)
  }

  const durationCompletion = input.plannedSession?.durationMin
    ? clamp(input.durationMin / input.plannedSession.durationMin, 0, 1.4)
    : undefined

  let orderDeviation = false
  if (input.plannedSession?.exerciseOrder?.length) {
    const firstPlanned = normalizeExerciseName(input.plannedSession.exerciseOrder[0])
    const actualPosition = normalizedActualNames.findIndex((name) => name === firstPlanned)
    orderDeviation = actualPosition > 1
  } else if (context.session.minimumCompoundMovements > 0) {
    const firstTwo = input.exercises.slice(0, 2)
    orderDeviation =
      input.exercises.some((exercise) => exercise.compoundOrIsolation === "compound") &&
      firstTwo.length === 2 &&
      firstTwo.every((exercise) => exercise.compoundOrIsolation === "isolation")
  }

  const incompleteFlag =
    Boolean(requiredExerciseCompletion !== undefined && requiredExerciseCompletion < 0.75) ||
    Boolean(plannedSetCompletion !== undefined && plannedSetCompletion < 0.75) ||
    Boolean(durationCompletion !== undefined && durationCompletion < 0.7) ||
    (context.session.label !== "恢复" && metrics.totalSets <= 3)

  return {
    requiredExerciseCompletion,
    plannedSetCompletion,
    durationCompletion,
    orderDeviation,
    incompleteFlag,
  }
}

export function buildGymSessionSnapshot(input: GymSessionInput): GymSessionSnapshot {
  const context = getGymTemplateContext(input.goalType, input.splitType, input.sessionTag)
  const patternEffectiveSets = createMovementRecord()
  const patternExerciseCount = createMovementRecord()
  const muscleEffectiveSets = createMuscleRecord()
  const muscleTotalSets = createMuscleRecord()
  const muscleExerciseCount = createMuscleRecord()

  let effectiveSets = 0
  let totalSets = 0
  let totalTonnage = 0
  let compoundEffectiveSets = 0
  let isolationEffectiveSets = 0
  let mainLiftWeightedSets = 0
  let lowerBodyEffectiveSets = 0
  let upperBodyEffectiveSets = 0
  let pushEffectiveSets = 0
  let pullEffectiveSets = 0
  let lowQualitySets = 0
  let heavyStrengthSets = 0
  let nearFailureSets = 0
  let compoundExerciseCount = 0
  let isolationExerciseCount = 0

  const repsCollected: number[] = []
  const rpeCollected: number[] = []
  const rirCollected: number[] = []
  const restCollected: number[] = []

  for (const exercise of input.exercises) {
    const reps = expandPerSetValues(exercise.repsPerSet, exercise.sets) ?? []
    const loads = expandPerSetValues(exercise.loadPerSet, exercise.sets)
    const rpes = expandPerSetValues(exercise.rpePerSet, exercise.sets)
    const rirs = expandPerSetValues(exercise.rirPerSet, exercise.sets)
    const rests = expandRestValues(exercise.restSec, exercise.sets)
    const isCompound = exercise.compoundOrIsolation === "compound"

    if (isCompound) {
      compoundExerciseCount += 1
    } else {
      isolationExerciseCount += 1
    }

    patternExerciseCount[exercise.movementPattern] += 1
    for (const muscle of exercise.primaryMuscles) {
      muscleExerciseCount[muscle] += 1
    }

    for (let index = 0; index < exercise.sets; index += 1) {
      const repsValue = reps[index] ?? reps[0] ?? 0
      const loadValue = loads?.[index] ?? loads?.[0] ?? 0
      const rpeValue = rpes?.[index] ?? rpes?.[0]
      const rirValue = rirs?.[index] ?? rirs?.[0]
      const restValue = rests[index]
      const setFactor = getEffectiveSetFactor(repsValue, rpeValue, rirValue)

      totalSets += 1
      effectiveSets += setFactor
      totalTonnage += loadValue * repsValue
      patternEffectiveSets[exercise.movementPattern] += setFactor

      if (setFactor < 0.45) {
        lowQualitySets += 1
      }

      if (isCompound) {
        compoundEffectiveSets += setFactor
      } else {
        isolationEffectiveSets += setFactor
      }

      mainLiftWeightedSets += setFactor * getMainLiftBias(exercise)

      if (hasLowerBodyPattern(exercise)) {
        lowerBodyEffectiveSets += setFactor
      }

      if (hasPushPattern(exercise) || hasPullPattern(exercise) || exercise.movementPattern === "vertical_push" || exercise.movementPattern === "vertical_pull") {
        upperBodyEffectiveSets += setFactor
      }

      if (hasPushPattern(exercise)) {
        pushEffectiveSets += setFactor
      }

      if (hasPullPattern(exercise)) {
        pullEffectiveSets += setFactor
      }

      if (repsValue <= 6 && (loadValue > 0 || (rpeValue ?? 0) >= 7 || (rirValue ?? 10) <= 3)) {
        heavyStrengthSets += 1
      }

      if ((rpeValue ?? 0) >= 8 || (rirValue ?? 10) <= 2) {
        nearFailureSets += 1
      }

      repsCollected.push(repsValue)
      if (rpeValue !== undefined) {
        rpeCollected.push(rpeValue)
      }
      if (rirValue !== undefined) {
        rirCollected.push(rirValue)
      }
      if (restValue !== undefined) {
        restCollected.push(restValue)
      }
    }

    for (const muscle of exercise.primaryMuscles) {
      muscleEffectiveSets[muscle] += reps.reduce((sum, repsValue, index) => {
        const rpeValue = rpes?.[index] ?? rpes?.[0]
        const rirValue = rirs?.[index] ?? rirs?.[0]
        return sum + getEffectiveSetFactor(repsValue, rpeValue, rirValue)
      }, 0)
      muscleTotalSets[muscle] += exercise.sets
    }
  }

  const focusCoveredCount = context.session.focusMuscles.filter((muscle) => muscleEffectiveSets[muscle] >= 1.5).length
  const requiredPatternCovered = context.session.primaryPatterns.filter((pattern) => patternEffectiveSets[pattern] >= 1).length

  const baseMetrics: GymSessionMetrics = {
    effectiveSets: round(effectiveSets),
    totalSets,
    totalTonnage: round(totalTonnage),
    compoundEffectiveSets: round(compoundEffectiveSets),
    isolationEffectiveSets: round(isolationEffectiveSets),
    mainLiftWeightedSets: round(mainLiftWeightedSets),
    lowerBodyEffectiveSets: round(lowerBodyEffectiveSets),
    upperBodyEffectiveSets: round(upperBodyEffectiveSets),
    pushEffectiveSets: round(pushEffectiveSets),
    pullEffectiveSets: round(pullEffectiveSets),
    lowQualitySetShare: totalSets > 0 ? round(lowQualitySets / totalSets) : 0,
    heavyStrengthSets,
    nearFailureSets,
    exerciseCount: input.exercises.length,
    compoundExerciseCount,
    isolationExerciseCount,
    averageReps: round(average(repsCollected)),
    averageRpe: rpeCollected.length > 0 ? round(average(rpeCollected)) : undefined,
    averageRir: rirCollected.length > 0 ? round(average(rirCollected)) : undefined,
    averageRestSec: restCollected.length > 0 ? round(average(restCollected)) : undefined,
    patternEffectiveSets,
    patternExerciseCount,
    muscleEffectiveSets,
    muscleTotalSets,
    muscleExerciseCount,
    focusMuscleCoverage: context.session.focusMuscles.length > 0 ? round(focusCoveredCount / context.session.focusMuscles.length, 2) : 1,
    requiredPatternCoverage: context.session.primaryPatterns.length > 0 ? round(requiredPatternCovered / context.session.primaryPatterns.length, 2) : 1,
    orderDeviation: false,
    incompleteFlag: false,
  }

  const plannedMetrics = computePlannedMetrics(input, context, baseMetrics)
  const confidence = calculateGymConfidence(input)

  return {
    input,
    context,
    confidence,
    metrics: {
      ...baseMetrics,
      ...plannedMetrics,
    },
  }
}

function statusFromScore(score: number): GymScoreDimension["status"] {
  if (score >= 85) return "excellent"
  if (score >= 72) return "good"
  if (score >= 58) return "fair"
  return "poor"
}

function scoreCompletion(snapshot: GymSessionSnapshot): GymScoreDimension {
  const { metrics, context, input } = snapshot
  const evidence: string[] = []
  let score = 100

  if (metrics.requiredPatternCoverage < 1) {
    score -= (1 - metrics.requiredPatternCoverage) * 30
    evidence.push(`核心动作模式覆盖率只有 ${Math.round(metrics.requiredPatternCoverage * 100)}%。`)
  } else {
    evidence.push("核心动作模式已覆盖。")
  }

  if (metrics.requiredExerciseCompletion !== undefined) {
    if (metrics.requiredExerciseCompletion < 1) {
      score -= (1 - metrics.requiredExerciseCompletion) * 30
      evidence.push(`计划中的关键动作仅完成 ${Math.round(metrics.requiredExerciseCompletion * 100)}%。`)
    } else {
      evidence.push("计划中的关键动作已完成。")
    }
  }

  if (metrics.plannedSetCompletion !== undefined) {
    if (metrics.plannedSetCompletion < 1) {
      score -= (1 - metrics.plannedSetCompletion) * 18
      evidence.push(`计划组数完成率 ${Math.round(metrics.plannedSetCompletion * 100)}%。`)
    } else {
      evidence.push("计划组数基本达成。")
    }
  }

  if (metrics.durationCompletion !== undefined) {
    if (metrics.durationCompletion < 0.8) {
      score -= 12
      evidence.push("训练时长明显短于计划。")
    }
  } else if (input.durationMin < 25 && input.sessionTag !== "recovery") {
    score -= 10
    evidence.push("非恢复训练时长偏短，存在删减迹象。")
  }

  if (metrics.orderDeviation) {
    score -= 10
    evidence.push("主项出现顺序偏后，训练顺序跑偏。")
  }

  if (metrics.compoundExerciseCount < context.session.minimumCompoundMovements) {
    score -= 14
    evidence.push("核心复合动作数量不足。")
  }

  if (metrics.incompleteFlag) {
    score -= 16
    evidence.push("存在明显中断或严重缩减。")
  }

  const finalScore = clamp(Math.round(score), 0, 100)
  return {
    score: finalScore,
    weight: DIMENSION_WEIGHT,
    status: statusFromScore(finalScore),
    summary: finalScore >= 75 ? "本次训练大体按结构完成。" : "本次训练完成度不足，结构执行出现缺口。",
    evidence,
  }
}

function scoreStimulusQuality(snapshot: GymSessionSnapshot): GymScoreDimension {
  const { metrics, context } = snapshot
  const evidence: string[] = []
  const effectiveSetTarget = getEffectiveSetTarget(context)
  const volumeScore = calculateRangeFitScore(metrics.effectiveSets, effectiveSetTarget)
  const coverageScore = clamp(metrics.focusMuscleCoverage * 100, 0, 100)
  const qualityScore = clamp(100 - metrics.lowQualitySetShare * 80, 35, 100)
  const compoundShare = metrics.effectiveSets > 0 ? metrics.compoundEffectiveSets / metrics.effectiveSets : 0
  const mainLiftScore = clamp((compoundShare / Math.max(context.goal.compoundShareTarget, 0.3)) * 100, 20, 100)
  const scatterPenalty =
    metrics.exerciseCount > context.session.recommendedExerciseCount[1] ||
    (metrics.exerciseCount >= 5 && metrics.effectiveSets / Math.max(metrics.exerciseCount, 1) < 1.6)
      ? 8
      : 0

  if (volumeScore < 100) {
    evidence.push(`有效组 ${metrics.effectiveSets} 组，偏离目标区间 ${effectiveSetTarget[0]}-${effectiveSetTarget[1]} 组。`)
  } else {
    evidence.push(`有效组落在目标区间 ${effectiveSetTarget[0]}-${effectiveSetTarget[1]} 组。`)
  }

  evidence.push(`目标肌群覆盖率 ${Math.round(metrics.focusMuscleCoverage * 100)}%。`)
  evidence.push(`低质量凑数组占比 ${Math.round(metrics.lowQualitySetShare * 100)}%。`)

  const finalScore = clamp(
    Math.round((volumeScore + coverageScore + qualityScore + mainLiftScore) / 4 - scatterPenalty),
    0,
    100,
  )

  return {
    score: finalScore,
    weight: DIMENSION_WEIGHT,
    status: statusFromScore(finalScore),
    summary: finalScore >= 75 ? "刺激基本打在了目标部位。" : "刺激质量不够集中，存在凑组或覆盖缺口。",
    evidence,
  }
}

function scoreLoadReasonableness(snapshot: GymSessionSnapshot): GymScoreDimension {
  const { metrics, context, input } = snapshot
  const evidence: string[] = []
  const effectiveSetTarget = getEffectiveSetTarget(context)
  const volumeLoadScore = calculateRangeFitScore(metrics.effectiveSets, effectiveSetTarget)
  let intensityScore = 75
  let fatigueScore = 100
  let redundancyScore = 100

  if (input.goalType === "strength") {
    intensityScore = clamp((metrics.heavyStrengthSets / 4) * 100, 20, 100)
    evidence.push(`力量目标下的重组数为 ${metrics.heavyStrengthSets} 组。`)
  } else if (input.goalType === "beginner_adaptation") {
    const beginnerPenalty = (metrics.averageRpe ?? 6) > 8 || (input.perceivedFatigue ?? 4) >= 8 ? 30 : 0
    intensityScore = 85 - beginnerPenalty
    evidence.push(`新手适应阶段平均主观强度 ${(metrics.averageRpe ?? 0).toFixed(1) || "未记录"}。`)
  } else {
    const closeToFailure = metrics.nearFailureSets / Math.max(metrics.totalSets, 1)
    intensityScore = clamp(closeToFailure * 120 + 35, 35, 100)
    evidence.push(`接近力竭的组占比 ${Math.round(closeToFailure * 100)}%。`)
  }

  const fatigueInputs = [input.perceivedFatigue, input.soreness].filter((value): value is number => value !== undefined)
  const fatigueMarker = fatigueInputs.length > 0 ? average(fatigueInputs) : 4
  const sleepPenalty = input.sleepQuality !== undefined && input.sleepQuality <= 4 ? 18 : 0
  if (fatigueMarker >= 8 && metrics.effectiveSets >= effectiveSetTarget[1]) {
    fatigueScore = 45 - sleepPenalty
    evidence.push("主观疲劳已高，但训练量仍然顶在高位。")
  } else if (fatigueMarker >= 7) {
    fatigueScore = 62 - sleepPenalty
    evidence.push("疲劳偏高，负荷推进需要更谨慎。")
  } else {
    fatigueScore = 88 - sleepPenalty
  }

  const topMuscleExposure = Math.max(...Object.values(metrics.muscleEffectiveSets))
  if (topMuscleExposure >= 12 || metrics.isolationExerciseCount >= 4 && metrics.compoundExerciseCount <= 1) {
    redundancyScore = 58
    evidence.push("同肌群堆叠或动作冗余偏多。")
  } else {
    redundancyScore = 90
  }

  if (metrics.averageRestSec !== undefined) {
    evidence.push(`平均组间休息约 ${Math.round(metrics.averageRestSec)} 秒。`)
  }

  const finalScore = clamp(
    Math.round((volumeLoadScore + intensityScore + fatigueScore + redundancyScore) / 4),
    0,
    100,
  )

  return {
    score: finalScore,
    weight: DIMENSION_WEIGHT,
    status: statusFromScore(finalScore),
    summary: finalScore >= 75 ? "负荷安排整体可恢复。" : "负荷安排与当前状态或目标存在错位。",
    evidence,
  }
}

function scoreGoalAlignment(snapshot: GymSessionSnapshot): GymScoreDimension {
  const { metrics, context, input } = snapshot
  const evidence: string[] = []
  let score = 70

  switch (input.goalType) {
    case "hypertrophy":
    case "recomposition":
    case "physique": {
      const targetScore = calculateRangeFitScore(metrics.effectiveSets, getEffectiveSetTarget(context))
      const proximityScore = clamp((metrics.nearFailureSets / Math.max(metrics.totalSets, 1)) * 120 + 25, 25, 100)
      const coverageScore = clamp(metrics.focusMuscleCoverage * 100, 0, 100)
      score = Math.round((targetScore + proximityScore + coverageScore) / 3)
      evidence.push("目标偏向肌肥大，重点看有效组、覆盖和接近力竭程度。")
      break
    }
    case "strength": {
      const heavyScore = clamp((metrics.heavyStrengthSets / 4) * 100, 20, 100)
      const compoundShare = metrics.effectiveSets > 0 ? metrics.compoundEffectiveSets / metrics.effectiveSets : 0
      const compoundScore = clamp((compoundShare / 0.7) * 100, 20, 100)
      const mainLiftScore = clamp((metrics.mainLiftWeightedSets / Math.max(metrics.effectiveSets, 1)) * 120, 20, 100)
      score = Math.round((heavyScore + compoundScore + mainLiftScore) / 3)
      evidence.push("力量目标需要主项强度和复合动作占比支撑。")
      break
    }
    case "fat_loss": {
      const densityScore = metrics.averageRestSec !== undefined ? clamp((150 - metrics.averageRestSec) / 90 * 100, 35, 100) : 70
      const muscleRetentionScore = metrics.compoundExerciseCount >= 1 ? 90 : 45
      const structureScore = clamp(metrics.requiredPatternCoverage * 100, 0, 100)
      score = Math.round((densityScore + muscleRetentionScore + structureScore) / 3)
      evidence.push("减脂训练要兼顾保肌与密度，而不是动作杂耍。")
      break
    }
    case "beginner_adaptation": {
      const patternScore = clamp(metrics.requiredPatternCoverage * 100, 0, 100)
      const fatigueCap = (input.perceivedFatigue ?? 4) >= 8 ? 45 : 90
      const compoundScore = metrics.compoundExerciseCount >= 1 ? 85 : 60
      score = Math.round((patternScore + fatigueCap + compoundScore) / 3)
      evidence.push("新手阶段更看重基础模式学习和稳定推进。")
      break
    }
  }

  return {
    score: clamp(score, 0, 100),
    weight: DIMENSION_WEIGHT,
    status: statusFromScore(score),
    summary: score >= 75 ? "训练内容与当前目标基本一致。" : "训练内容没有充分服务当前目标。",
    evidence,
  }
}

function buildDeviation(
  code: GymDeviation["code"],
  severity: GymDeviation["severity"],
  explanation: string,
  evidence: string[],
  suggestedFix: string,
): GymDeviation {
  return {
    code,
    severity,
    explanation,
    evidence,
    suggestedFix,
  }
}

function detectDeviations(
  snapshot: GymSessionSnapshot,
  scoreBreakdown: GymAnalysisResult["scoreBreakdown"],
): GymDeviation[] {
  const { metrics, context, input } = snapshot
  const deviations: GymDeviation[] = []
  const chestFrontDelts = metrics.muscleEffectiveSets.chest + metrics.muscleEffectiveSets.front_delts
  const backTotal = metrics.muscleEffectiveSets.lats + metrics.muscleEffectiveSets.upper_back

  if (chestFrontDelts >= 8 && chestFrontDelts > backTotal * 1.5) {
    deviations.push(buildDeviation("chest_front_delts_overload", chestFrontDelts > backTotal * 2 ? "high" : "medium", "胸和前束堆量明显高于背部，结构容易继续前倾。", [`胸/前束有效组 ${round(chestFrontDelts)}，背部有效组 ${round(backTotal)}。`], "下次优先补一项水平拉和一项垂直拉，减少前束孤立动作。"))
  }

  if (["pull", "upper", "full_body"].includes(input.sessionTag) && backTotal < 4) {
    deviations.push(buildDeviation("back_volume_insufficient", "medium", "背部刺激不足，拉类训练没有真正打够。", [`背部有效组只有 ${round(backTotal)} 组。`], "至少补足 6-8 组背部有效组，并让水平拉/垂直拉各出现一次。"))
  }

  if (["legs", "lower", "full_body"].includes(input.sessionTag) && metrics.lowerBodyEffectiveSets < 5) {
    deviations.push(buildDeviation("leg_training_avoidance", metrics.lowerBodyEffectiveSets < 3 ? "high" : "medium", "这次训练名义上包含下肢，但实际腿部刺激偏少。", [`下肢有效组 ${round(metrics.lowerBodyEffectiveSets)} 组。`], "下次把深蹲/髋铰链放在前面，先完成 2 个下肢主项。"))
  }

  const pushPullRatio = metrics.pullEffectiveSets > 0 ? metrics.pushEffectiveSets / metrics.pullEffectiveSets : 99
  if (pushPullRatio > 1.5 || pushPullRatio < 0.67) {
    deviations.push(buildDeviation("push_pull_imbalance", Math.abs(pushPullRatio - 1) > 1 ? "high" : "medium", "推拉量不平衡，长期容易把体态和恢复推偏。", [`推类有效组 ${round(metrics.pushEffectiveSets)}，拉类有效组 ${round(metrics.pullEffectiveSets)}。`], "把下一次训练的推拉有效组拉回接近 1:1，至少别再继续单边堆量。"))
  }

  const isolationShare = metrics.effectiveSets > 0 ? metrics.isolationEffectiveSets / metrics.effectiveSets : 0
  if (isolationShare > context.session.maxIsolationShare) {
    deviations.push(buildDeviation("too_many_isolation_movements", isolationShare > context.session.maxIsolationShare + 0.2 ? "high" : "medium", "孤立动作占比过高，训练被切碎了。", [`孤立动作有效组占比 ${Math.round(isolationShare * 100)}%。`], "先做主项，再把孤立动作压缩到总训练量的后半段。"))
  }

  if (metrics.compoundExerciseCount < context.session.minimumCompoundMovements) {
    deviations.push(buildDeviation("compound_lift_missing", "high", "缺少足够的复合动作，训练很难建立核心刺激。", [`复合动作数量 ${metrics.compoundExerciseCount}，模板要求至少 ${context.session.minimumCompoundMovements}。`], "下次优先加入一到两个复合主项，别让辅助动作抢掉主线。"))
  }

  if (metrics.effectiveSets < getEffectiveSetTarget(context)[0]) {
    deviations.push(buildDeviation("effective_sets_insufficient", "medium", "有效组不足，今天的刺激还没有到该到的位置。", [`有效组 ${metrics.effectiveSets}，目标下限 ${getEffectiveSetTarget(context)[0]}。`], "下次先把关键部位补到目标下限，再决定要不要加花活。"))
  }

  if ((input.perceivedFatigue ?? 0) >= 8 && (scoreBreakdown.loadReasonableness.score < 75 || metrics.effectiveSets >= getEffectiveSetTarget(context)[1])) {
    deviations.push(buildDeviation("excessive_fatigue_risk", "high", "疲劳已经很高，但负荷仍在硬顶。", [`主观疲劳 ${input.perceivedFatigue ?? "未记录"}，负荷合理性 ${scoreBreakdown.loadReasonableness.score}。`], "下一次把总组数和接近力竭的组各砍掉一截，先恢复再推进。"))
  }

  if (input.goalType === "strength" && metrics.heavyStrengthSets < 3) {
    deviations.push(buildDeviation("intensity_too_low_for_strength", "high", "力量目标下的重组数明显不够，训练像是在维持而不是推进。", [`重组数只有 ${metrics.heavyStrengthSets} 组。`], "下次把主项前几组收进 1-6 次区间，并保留 1-3 RIR 的高质量组。"))
  }

  if (["hypertrophy", "physique", "recomposition"].includes(input.goalType) && metrics.effectiveSets < getEffectiveSetTarget(context)[0]) {
    deviations.push(buildDeviation("volume_too_low_for_hypertrophy", "medium", "增肌导向训练量偏低，刺激不足以稳定累积。", [`有效组 ${metrics.effectiveSets}，目标下限 ${getEffectiveSetTarget(context)[0]}。`], "把目标部位再补 2-4 组高质量工作组，优先加在主项或高收益辅助上。"))
  }

  if (metrics.isolationEffectiveSets > metrics.compoundEffectiveSets || metrics.mainLiftWeightedSets / Math.max(metrics.effectiveSets, 1) < 0.45) {
    deviations.push(buildDeviation("accessory_over_main_lift", "medium", "辅助动作抢走了训练主线，主项权重偏低。", [`复合有效组 ${metrics.compoundEffectiveSets}，孤立有效组 ${metrics.isolationEffectiveSets}。`, `主项加权占比 ${Math.round((metrics.mainLiftWeightedSets / Math.max(metrics.effectiveSets, 1)) * 100)}%。`], "下次把主项做满，再决定还剩多少恢复预算给辅助动作。"))
  }

  if (Math.max(...Object.values(metrics.muscleEffectiveSets)) >= 12) {
    const topMuscle = Object.entries(metrics.muscleEffectiveSets).sort((left, right) => right[1] - left[1])[0]
    deviations.push(buildDeviation("repeated_same_muscle_overload", "medium", "同一肌群被反复堆量，恢复压力开始不划算。", [`${topMuscle[0]} 累计有效组 ${round(topMuscle[1])}。`], "下次把同肌群的重复动作砍掉一到两个，换成薄弱环节补强。"))
  }

  if (scoreBreakdown.goalAlignment.score < 65) {
    deviations.push(buildDeviation("poor_goal_alignment", "medium", "这次训练没有明显服务当前目标。", [`目标匹配度只有 ${scoreBreakdown.goalAlignment.score} 分。`], "先明确今天要推进的能力或部位，再按主项优先去排动作和组数。"))
  }

  if (scoreBreakdown.completion.score < 68) {
    deviations.push(buildDeviation("incomplete_session_execution", "high", "训练执行不完整，计划意图没有被真正落地。", [`完成度只有 ${scoreBreakdown.completion.score} 分。`], "下次先保住关键动作和关键组，必要时删掉尾部附件而不是删主项。"))
  }

  const severityOrder = { high: 3, medium: 2, low: 1 }
  return deviations.sort((left, right) => severityOrder[right.severity] - severityOrder[left.severity])
}

function buildMuscleGroupSummary(snapshot: GymSessionSnapshot): GymAnalysisResult["muscleGroupSummary"] {
  const { metrics } = snapshot
  return Object.entries(metrics.muscleEffectiveSets)
    .filter(([, effectiveSets]) => effectiveSets > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([muscleGroup, effectiveSets]) => ({
      muscleGroup: muscleGroup as MuscleGroup,
      effectiveSets: round(effectiveSets),
      totalSets: round(metrics.muscleTotalSets[muscleGroup as MuscleGroup]),
      emphasis: effectiveSets >= 8 ? "high" : effectiveSets >= 4 ? "moderate" : effectiveSets >= 1 ? "low" : "none",
    }))
}

function buildPatternCoverage(snapshot: GymSessionSnapshot): GymAnalysisResult["movementPatternCoverage"] {
  const { metrics, context } = snapshot
  return MOVEMENT_PATTERNS
    .filter((pattern) => metrics.patternExerciseCount[pattern] > 0 || context.session.primaryPatterns.includes(pattern))
    .map((pattern) => ({
      movementPattern: pattern,
      exerciseCount: metrics.patternExerciseCount[pattern],
      totalSets: round(metrics.patternEffectiveSets[pattern]),
      covered: metrics.patternEffectiveSets[pattern] >= 1,
    }))
}

function buildInferredFocus(snapshot: GymSessionSnapshot): string[] {
  const { metrics, input } = snapshot
  const topMuscles = Object.entries(metrics.muscleEffectiveSets).sort((left, right) => right[1] - left[1]).slice(0, 2).map(([muscle]) => muscle)
  const topPatterns = Object.entries(metrics.patternEffectiveSets).sort((left, right) => right[1] - left[1]).slice(0, 2).map(([pattern]) => pattern)

  return [
    `${input.sessionTag} day`,
    ...topMuscles.map((muscle) => `重点肌群 ${muscle}`),
    ...topPatterns.map((pattern) => `主要模式 ${pattern}`),
  ]
}

function buildStrongestSignal(scoreBreakdown: GymAnalysisResult["scoreBreakdown"]): string {
  const ordered = [
    ["训练完成度", scoreBreakdown.completion.score, scoreBreakdown.completion.summary],
    ["刺激质量", scoreBreakdown.stimulusQuality.score, scoreBreakdown.stimulusQuality.summary],
    ["负荷合理性", scoreBreakdown.loadReasonableness.score, scoreBreakdown.loadReasonableness.summary],
    ["目标匹配度", scoreBreakdown.goalAlignment.score, scoreBreakdown.goalAlignment.summary],
  ].sort((left, right) => Number(right[1]) - Number(left[1]))

  return `${ordered[0][0]}最强：${ordered[0][2]}`
}

function buildBiggestCorrection(deviations: GymDeviation[], scoreBreakdown: GymAnalysisResult["scoreBreakdown"]): string {
  if (deviations.length > 0) {
    return deviations[0].suggestedFix
  }

  const ordered = [
    ["训练完成度", scoreBreakdown.completion.score, scoreBreakdown.completion.summary],
    ["刺激质量", scoreBreakdown.stimulusQuality.score, scoreBreakdown.stimulusQuality.summary],
    ["负荷合理性", scoreBreakdown.loadReasonableness.score, scoreBreakdown.loadReasonableness.summary],
    ["目标匹配度", scoreBreakdown.goalAlignment.score, scoreBreakdown.goalAlignment.summary],
  ].sort((left, right) => Number(left[1]) - Number(right[1]))

  return `优先修正${ordered[0][0]}：${ordered[0][2]}`
}

function buildNextSessionSuggestions(snapshot: GymSessionSnapshot, deviations: GymDeviation[]): GymNextSessionSuggestion[] {
  const { metrics, context, input } = snapshot
  const suggestions: GymNextSessionSuggestion[] = []

  for (const deviation of deviations.slice(0, 3)) {
    suggestions.push({
      title: deviation.code.replace(/_/g, " "),
      action: deviation.suggestedFix,
      rationale: deviation.explanation,
      source: deviation.code === "excessive_fatigue_risk" ? "recovery" : "deviation",
    })
  }

  if (metrics.requiredPatternCoverage < 1) {
    suggestions.push({
      title: "补齐核心模式",
      action: `下次先补上 ${context.session.primaryPatterns.filter((pattern) => metrics.patternEffectiveSets[pattern] < 1).join(" / ")} 模式。`,
      rationale: "模板要求的主模式还没有完整出现，结构刺激不完整。",
      source: "coverage",
    })
  }

  if (input.goalType === "strength" && metrics.heavyStrengthSets < 3) {
    suggestions.push({
      title: "提高主项强度",
      action: "主项前 3-4 组进入 1-6 次区间，并保留 1-3 RIR。",
      rationale: "力量目标更依赖高质量重组，而不是堆大量中高次数附件。",
      source: "goal_alignment",
    })
  }

  if ((input.perceivedFatigue ?? 0) >= 8) {
    suggestions.push({
      title: "先降恢复压力",
      action: "总量先减 20% 左右，优先留下主项与关键辅助。",
      rationale: "当前疲劳已经高，继续硬堆只会放大恢复债。",
      source: "load",
    })
  }

  return suggestions.slice(0, 4)
}

export function calculateGymScore(input: GymSessionInput): GymAnalysisResult {
  const snapshot = buildGymSessionSnapshot(input)
  const completion = scoreCompletion(snapshot)
  const stimulusQuality = scoreStimulusQuality(snapshot)
  const loadReasonableness = scoreLoadReasonableness(snapshot)
  const goalAlignment = scoreGoalAlignment(snapshot)

  const scoreBreakdown = {
    completion,
    stimulusQuality,
    loadReasonableness,
    goalAlignment,
  }

  const finalScore = Math.round(
    completion.score * completion.weight +
    stimulusQuality.score * stimulusQuality.weight +
    loadReasonableness.score * loadReasonableness.weight +
    goalAlignment.score * goalAlignment.weight,
  )

  const detectedDeviations = detectDeviations(snapshot, scoreBreakdown)
  const confidenceBand = snapshot.confidence.confidenceLevel
  const rangeHalfWidth = confidenceBand === "high" ? 4 : confidenceBand === "medium" ? 8 : 12
  const advancedInsights = [
    estimateStrengthMetrics(input),
    estimateVolumeLandmarks(snapshot),
    estimateFatigueSignals(input, snapshot),
  ]
  const availableAdvancedInsights = advancedInsights.filter((insight) => !insight.failureReason)

  return {
    inferredFocus: buildInferredFocus(snapshot),
    scoreBreakdown,
    finalGymScore: finalScore,
    finalScore,
    scoreRange: {
      lower: clamp(finalScore - rangeHalfWidth, 0, 100),
      upper: clamp(finalScore + rangeHalfWidth, 0, 100),
    },
    confidenceBand,
    confidence: snapshot.confidence,
    detectedDeviations,
    strongestSignal: buildStrongestSignal(scoreBreakdown),
    biggestCorrection: buildBiggestCorrection(detectedDeviations, scoreBreakdown),
    muscleGroupSummary: buildMuscleGroupSummary(snapshot),
    movementPatternCoverage: buildPatternCoverage(snapshot),
    nextSessionSuggestions: buildNextSessionSuggestions(snapshot, detectedDeviations),
    advancedInsightsAvailable: availableAdvancedInsights.length > 0,
    advancedInsights,
  }
}
