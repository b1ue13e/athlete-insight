import type { GymAdvancedInsight } from "../schemas"
import type { GymSessionSnapshot } from "../engine"

export function estimateVolumeLandmarks(snapshot: GymSessionSnapshot): GymAdvancedInsight {
  const [targetLower, targetUpper] = [
    snapshot.context.goal.targetEffectiveSetsRange[0],
    snapshot.context.goal.targetEffectiveSetsRange[1],
  ]

  return {
    key: "volume_landmarks",
    label: "Volume Landmarks",
    advanced: true,
    experimental: true,
    evidenceLevel: snapshot.confidence.confidenceLevel === "high" ? "moderate" : "weak",
    requiredFields: ["exercise sets", "muscle tags"],
    data: {
      actualEffectiveSets: snapshot.metrics.effectiveSets,
      targetRange: [targetLower, targetUpper],
      topMuscles: Object.entries(snapshot.metrics.muscleEffectiveSets)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4),
    },
  }
}
