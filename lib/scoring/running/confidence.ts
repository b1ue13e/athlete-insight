import type { RunningConfidence, RunningDerivedMetrics, RunningSessionInput } from "./schemas"
import { toConfidenceBand } from "./schemas"

function pushUnique(items: string[], value: string) {
  if (!items.includes(value)) {
    items.push(value)
  }
}

export function calculateRunningConfidence(
  input: RunningSessionInput,
  derived: RunningDerivedMetrics
): RunningConfidence {
  let score = 100
  const reasons: string[] = []
  const missingData: string[] = []

  if (!input.splits?.length) {
    score -= 12
    pushUnique(missingData, "splits")
    pushUnique(reasons, "缺少分段配速，节奏控制只能用均值近似。")
  }

  if (input.avgHeartRate === undefined || input.maxHeartRate === undefined) {
    score -= 10
    pushUnique(missingData, "heartRate")
    pushUnique(reasons, "缺少完整心率区间，负荷质量主要依赖配速和 RPE。")
  }

  if (input.rpe === undefined) {
    score -= 4
    pushUnique(missingData, "rpe")
  }

  if (
    input.plannedDistance === undefined &&
    input.plannedDuration === undefined &&
    input.plannedPaceRange === undefined &&
    input.plannedHeartRateRange === undefined
  ) {
    score -= 8
    pushUnique(missingData, "plan")
    pushUnique(reasons, "缺少训练计划值，训练完成度按训练类型常模估计。")
  }

  if (input.source === "manual") {
    score -= 5
    pushUnique(reasons, "本次为手动录入，精度取决于回忆和手工输入。")
  }

  if (input.trainingType === "interval" && !input.splits?.length) {
    score -= 10
    pushUnique(reasons, "间歇跑没有组间 split，无法高置信判断后程失控。")
  }

  if ((input.trainingType === "easy" || input.trainingType === "recovery") && input.avgHeartRate === undefined && input.rpe === undefined) {
    score -= 8
    pushUnique(reasons, "轻松 / 恢复跑缺少心率和主观强度，是否跑进灰区只能低置信判断。")
  }

  if (derived.telemetryPointCount === 0) {
    pushUnique(reasons, "没有高级时序数据，高级洞察将隐藏或降级。")
  }

  score = Math.max(20, Math.min(100, Math.round(score)))

  return {
    score,
    band: toConfidenceBand(score),
    reasons,
    missingData,
  }
}
