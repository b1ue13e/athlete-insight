import { buildGymSessionSnapshot, calculateGymScore } from "./engine"
import type { GymSessionInput, GymWeeklyAnalysisResult, MuscleGroup, MovementPattern } from "./schemas"

const KEY_MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "lats",
  "upper_back",
  "quads",
  "hamstrings",
  "glutes",
  "side_delts",
]

const KEY_PATTERNS: MovementPattern[] = [
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "squat",
  "hinge",
  "lunge",
  "conditioning",
]

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function ratioLabel(ratio: number, balancedThreshold = 0.2): string {
  if (!Number.isFinite(ratio)) {
    return "single-sided"
  }

  if (Math.abs(ratio - 1) <= balancedThreshold) {
    return "balanced"
  }

  return ratio > 1 ? "high-first-side" : "high-second-side"
}

export function analyzeGymWeeklyBlock(sessions: GymSessionInput[]): GymWeeklyAnalysisResult {
  const snapshots = sessions.map(buildGymSessionSnapshot)
  const analyses = sessions.map(calculateGymScore)
  const muscleGroupWeeklySets: Record<string, number> = {}
  const movementPatternDistribution: Record<string, number> = {}

  let totalDuration = 0
  let pushSets = 0
  let pullSets = 0
  let upperSets = 0
  let lowerSets = 0
  let isolationSets = 0
  let compoundSets = 0
  let skippedPlannedSessions = 0
  let fatigueMarkers = 0

  for (let index = 0; index < snapshots.length; index += 1) {
    const snapshot = snapshots[index]
    totalDuration += snapshot.input.durationMin
    pushSets += snapshot.metrics.pushEffectiveSets
    pullSets += snapshot.metrics.pullEffectiveSets
    upperSets += snapshot.metrics.upperBodyEffectiveSets
    lowerSets += snapshot.metrics.lowerBodyEffectiveSets
    isolationSets += snapshot.metrics.isolationEffectiveSets
    compoundSets += snapshot.metrics.compoundEffectiveSets

    if (snapshot.metrics.incompleteFlag || analyses[index].scoreBreakdown.completion.score < 75) {
      skippedPlannedSessions += snapshot.input.plannedSession ? 1 : 0
    }

    if ((snapshot.input.perceivedFatigue ?? 0) >= 7 || (snapshot.input.soreness ?? 0) >= 7) {
      fatigueMarkers += 1
    }

    for (const muscle of KEY_MUSCLE_GROUPS) {
      muscleGroupWeeklySets[muscle] = round((muscleGroupWeeklySets[muscle] ?? 0) + snapshot.metrics.muscleEffectiveSets[muscle])
    }

    for (const pattern of KEY_PATTERNS) {
      movementPatternDistribution[pattern] = round((movementPatternDistribution[pattern] ?? 0) + snapshot.metrics.patternEffectiveSets[pattern])
    }
  }

  const pushPullRatio = pullSets > 0 ? round(pushSets / pullSets) : 99
  const upperLowerRatio = lowerSets > 0 ? round(upperSets / lowerSets) : 99
  const isolationShare = (compoundSets + isolationSets) > 0 ? isolationSets / (compoundSets + isolationSets) : 0

  const keyImbalanceFlags: string[] = []
  if ((muscleGroupWeeklySets.lats ?? 0) + (muscleGroupWeeklySets.upper_back ?? 0) < 10) {
    keyImbalanceFlags.push("back_volume_insufficient")
  }
  if (((muscleGroupWeeklySets.quads ?? 0) + (muscleGroupWeeklySets.hamstrings ?? 0) + (muscleGroupWeeklySets.glutes ?? 0)) < 12) {
    keyImbalanceFlags.push("leg_training_avoidance")
  }
  if (pushPullRatio > 1.5 || pushPullRatio < 0.67) {
    keyImbalanceFlags.push("push_pull_imbalance")
  }
  if (isolationShare > 0.52) {
    keyImbalanceFlags.push("too_many_isolation_movements")
  }
  const dominantPatternEntry = Object.entries(movementPatternDistribution).sort((left, right) => right[1] - left[1])[0]
  const totalPatternSets = Object.values(movementPatternDistribution).reduce((sum, value) => sum + value, 0)
  if (dominantPatternEntry && totalPatternSets > 0 && dominantPatternEntry[1] / totalPatternSets > 0.5) {
    keyImbalanceFlags.push("same_pattern_overuse")
  }

  let estimatedRecoveryPressure: GymWeeklyAnalysisResult["estimatedRecoveryPressure"] = "low"
  if (fatigueMarkers >= 2 || totalDuration > 420 || keyImbalanceFlags.includes("same_pattern_overuse")) {
    estimatedRecoveryPressure = "high"
  } else if (fatigueMarkers >= 1 || totalDuration > 300) {
    estimatedRecoveryPressure = "medium"
  }

  let weeklyStructureAssessment = "本周结构基本完整。"
  if (keyImbalanceFlags.includes("leg_training_avoidance")) {
    weeklyStructureAssessment = "本周下肢刺激明显不足，结构已经偏上肢化。"
  } else if (keyImbalanceFlags.includes("back_volume_insufficient")) {
    weeklyStructureAssessment = "本周背部刺激偏低，容易继续放大推拉失衡。"
  } else if (keyImbalanceFlags.includes("push_pull_imbalance")) {
    weeklyStructureAssessment = "本周推拉比例失衡，结构平衡需要优先修正。"
  } else if (keyImbalanceFlags.includes("same_pattern_overuse")) {
    weeklyStructureAssessment = "本周模式重复过多，刺激新鲜度和恢复都在下降。"
  }

  const nextWeekAdvice: string[] = []
  if (keyImbalanceFlags.includes("leg_training_avoidance")) {
    nextWeekAdvice.push("下周先锁定 1-2 次腿部或下肢日，不要再把腿训练往后拖。")
  }
  if (keyImbalanceFlags.includes("back_volume_insufficient")) {
    nextWeekAdvice.push("把背部有效组提高到至少 10-14 组，并保证水平拉和垂直拉都出现。")
  }
  if (keyImbalanceFlags.includes("push_pull_imbalance")) {
    nextWeekAdvice.push("下一周优先把拉类训练补到接近推类总量。")
  }
  if (estimatedRecoveryPressure === "high") {
    nextWeekAdvice.push("恢复压力偏高，下周总量先降 15-20%，减少重复附件。")
  }
  if (nextWeekAdvice.length === 0) {
    nextWeekAdvice.push("下周延续当前节奏，小幅推进主项或薄弱肌群即可。")
  }

  return {
    totalSessions: sessions.length,
    totalDuration,
    muscleGroupWeeklySets,
    movementPatternDistribution,
    pushPullBalance: {
      ratio: pushPullRatio,
      label: ratioLabel(pushPullRatio),
    },
    upperLowerBalance: {
      ratio: upperLowerRatio,
      label: ratioLabel(upperLowerRatio, 0.25),
    },
    estimatedRecoveryPressure,
    skippedPlannedSessions,
    weeklyStructureAssessment,
    keyImbalanceFlags,
    nextWeekAdvice: nextWeekAdvice.slice(0, 4),
  }
}
