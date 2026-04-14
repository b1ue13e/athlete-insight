import type { GymAdvancedInsight, GymSessionInput } from "../schemas"
import { expandPerSetValues } from "../schemas"

function estimateE1RM(load: number, reps: number): number {
  return load * (1 + reps / 30)
}

export function estimateStrengthMetrics(input: GymSessionInput): GymAdvancedInsight {
  const candidates = input.exercises.flatMap((exercise) => {
    const loads = expandPerSetValues(exercise.loadPerSet, exercise.sets)
    const reps = expandPerSetValues(exercise.repsPerSet, exercise.sets) ?? []

    if (!loads || loads.length === 0) {
      return []
    }

    return reps
      .map((repValue, index) => {
        const load = loads[index] ?? loads[0]
        if (!load || repValue > 10) {
          return undefined
        }

        return {
          exerciseName: exercise.exerciseName,
          estimated1RM: Math.round(estimateE1RM(load, repValue)),
          bestSet: `${load} x ${repValue}`,
        }
      })
      .filter((value): value is { exerciseName: string; estimated1RM: number; bestSet: string } => Boolean(value))
  })

  if (candidates.length === 0) {
    return {
      key: "strength_metrics",
      label: "Strength Metrics",
      advanced: true,
      experimental: false,
      evidenceLevel: "weak",
      requiredFields: ["loadPerSet", "repsPerSet"],
      failureReason: "缺少可用于估算 e1RM 的负重与低次数组。",
    }
  }

  return {
    key: "strength_metrics",
    label: "Strength Metrics",
    advanced: true,
    experimental: false,
    evidenceLevel: candidates.length >= 3 ? "moderate" : "weak",
    requiredFields: ["loadPerSet", "repsPerSet"],
    data: {
      estimatedTopSets: candidates.slice(0, 5),
    },
  }
}
