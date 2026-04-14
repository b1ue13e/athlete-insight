import { buildGymSessionSnapshot } from "./engine"
import { analyzeGymWeeklyBlock } from "./weekly-analysis"
import type { GymMesocycleAnalysisResult, GymSessionInput } from "./schemas"
import { expandPerSetValues } from "./schemas"

function startOfWeek(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

function directionFromSeries(values: number[], flatThreshold = 0.05): "up" | "flat" | "down" {
  if (values.length < 2) {
    return "flat"
  }

  const first = values[0]
  const last = values[values.length - 1]
  if (first === 0) {
    return last === 0 ? "flat" : "up"
  }

  const delta = (last - first) / first
  if (Math.abs(delta) <= flatThreshold) {
    return "flat"
  }

  return delta > 0 ? "up" : "down"
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function estimateBestE1RM(session: GymSessionInput, exerciseName: string): number | undefined {
  const exercise = session.exercises.find((item) => item.exerciseName === exerciseName)
  if (!exercise) {
    return undefined
  }

  const loads = expandPerSetValues(exercise.loadPerSet, exercise.sets)
  const reps = expandPerSetValues(exercise.repsPerSet, exercise.sets)
  if (!loads || !reps) {
    return undefined
  }

  const estimates = reps
    .map((repValue, index) => {
      const load = loads[index] ?? loads[0]
      if (!load || repValue > 10) {
        return undefined
      }

      return load * (1 + repValue / 30)
    })
    .filter((value): value is number => value !== undefined)

  if (estimates.length === 0) {
    return undefined
  }

  return Math.max(...estimates)
}

export function analyzeGymMesocycle(input: GymSessionInput[] | GymSessionInput[][]): GymMesocycleAnalysisResult {
  const weeks = Array.isArray(input[0])
    ? (input as GymSessionInput[][])
    : Object.values(
        (input as GymSessionInput[]).reduce((accumulator, session) => {
          const key = startOfWeek(session.sessionDate)
          if (!accumulator[key]) {
            accumulator[key] = []
          }
          accumulator[key].push(session)
          return accumulator
        }, {} as Record<string, GymSessionInput[]>),
      )

  const weeklyReports = weeks.map(analyzeGymWeeklyBlock)
  const weeklyEffectiveSets = weeks.map((sessions) => round(sessions.map(buildGymSessionSnapshot).reduce((sum, snapshot) => sum + snapshot.metrics.effectiveSets, 0)))
  const weeklyCompletion = weeks.map((sessions) => {
    const scores = sessions.map((session) => buildGymSessionSnapshot(session).metrics.incompleteFlag ? 55 : 90)
    return round(scores.reduce((sum, score) => sum + score, 0) / Math.max(scores.length, 1))
  })
  const weeklyRecovery = weeklyReports.map((report) => report.estimatedRecoveryPressure)

  const exerciseFrequency = (Array.isArray(input[0]) ? input.flat() : input as GymSessionInput[]).reduce((accumulator, session) => {
    for (const exercise of session.exercises) {
      accumulator[exercise.exerciseName] = (accumulator[exercise.exerciseName] ?? 0) + 1
    }
    return accumulator
  }, {} as Record<string, number>)

  const candidateMainLifts = Object.entries(exerciseFrequency)
    .filter(([, count]) => count >= 2)
    .map(([exerciseName]) => exerciseName)
    .slice(0, 5)

  const mainLiftTrends = candidateMainLifts.flatMap((exerciseName) => {
    const series = (Array.isArray(input[0]) ? input.flat() : input as GymSessionInput[])
      .map((session) => estimateBestE1RM(session, exerciseName))
      .filter((value): value is number => value !== undefined)

    if (series.length < 2) {
      return []
    }

    const first = series[0]
    const last = series[series.length - 1]
    const changePercent = first > 0 ? round(((last - first) / first) * 100) : 0

    return [{
      exerciseName,
      trend: directionFromSeries(series, 0.03),
      changePercent,
    }]
  })

  const incompleteSessions = (Array.isArray(input[0]) ? input.flat() : input as GymSessionInput[])
    .filter((session) => buildGymSessionSnapshot(session).metrics.incompleteFlag)

  const skippedTagFrequency = incompleteSessions.reduce((accumulator, session) => {
    accumulator[session.sessionTag] = (accumulator[session.sessionTag] ?? 0) + 1
    return accumulator
  }, {} as Record<string, number>)

  const muscleCoverage = weeklyReports.reduce((accumulator, report) => {
    for (const [muscle, sets] of Object.entries(report.muscleGroupWeeklySets)) {
      accumulator[muscle] = [...(accumulator[muscle] ?? []), sets]
    }
    return accumulator
  }, {} as Record<string, number[]>)

  const mostUnderdosedMuscles = Object.entries(muscleCoverage)
    .filter(([, sets]) => sets.every((value) => value < 6))
    .sort((left, right) => average(left[1]) - average(right[1]))
    .slice(0, 4)
    .map(([muscle]) => muscle)

  const needsDeload =
    weeklyRecovery.slice(-2).every((pressure) => pressure === "high") ||
    (directionFromSeries(weeklyEffectiveSets, 0.08) === "up" && directionFromSeries(weeklyCompletion, 0.05) === "down")

  return {
    weekCount: weeks.length,
    mainLiftTrends,
    trainingVolumeTrend: {
      direction: directionFromSeries(weeklyEffectiveSets, 0.08),
      weeklyEffectiveSets,
    },
    recoveryPressureTrend: {
      direction: weeklyRecovery.length >= 2 && weeklyRecovery[weeklyRecovery.length - 1] !== weeklyRecovery[0]
        ? weeklyRecovery[weeklyRecovery.length - 1] === "high" || weeklyRecovery[0] === "low" ? "up" : "down"
        : "flat",
      weeklyPressure: weeklyRecovery,
    },
    planExecutionTrend: {
      direction: directionFromSeries(weeklyCompletion, 0.05),
      weeklyCompletion,
    },
    needsDeload,
    deloadReason: needsDeload ? "恢复压力持续偏高，或训练量上升同时执行质量下滑。" : undefined,
    mostSkippedSessionTags: Object.entries(skippedTagFrequency).sort((left, right) => right[1] - left[1]).slice(0, 3).map(([tag]) => tag),
    mostUnderdosedMuscles,
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}
