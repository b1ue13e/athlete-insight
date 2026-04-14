import type { GymAdvancedInsight, GymSessionInput } from "../schemas"
import type { GymSessionSnapshot } from "../engine"

export function estimateFatigueSignals(input: GymSessionInput, snapshot: GymSessionSnapshot): GymAdvancedInsight {
  const subjectiveSignals = [input.perceivedFatigue, input.soreness, input.sleepQuality].filter((value) => value !== undefined)

  if (subjectiveSignals.length < 2) {
    return {
      key: "fatigue_signals",
      label: "Fatigue Signals",
      advanced: true,
      experimental: true,
      evidenceLevel: "weak",
      requiredFields: ["perceivedFatigue", "soreness", "sleepQuality"],
      failureReason: "主观恢复字段不足，无法输出疲劳信号估计。",
    }
  }

  const fatigueScore = ((input.perceivedFatigue ?? 5) + (input.soreness ?? 5) + (11 - (input.sleepQuality ?? 5))) / 3

  return {
    key: "fatigue_signals",
    label: "Fatigue Signals",
    advanced: true,
    experimental: true,
    evidenceLevel: subjectiveSignals.length === 3 ? "moderate" : "weak",
    requiredFields: ["perceivedFatigue", "soreness", "sleepQuality"],
    data: {
      estimatedFatigueSignal: Math.round(fatigueScore * 10) / 10,
      sessionLoadScore: snapshot.metrics.effectiveSets,
      caution: fatigueScore >= 7 ? "high" : fatigueScore >= 5.5 ? "moderate" : "low",
    },
  }
}
