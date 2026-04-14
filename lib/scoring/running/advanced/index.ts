import type { RunningSessionInput, RunningTelemetryPoint } from "../schemas"
import type {
  AdvancedInsightEvidenceLevel,
  RunningAdvancedInsight,
  RunningAdvancedInsightBundle,
} from "./types"

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function paceEfficiency(points: RunningTelemetryPoint[]) {
  return average(
    points
      .filter((point) => point.heartRate !== undefined)
      .map((point) => (1000 / point.paceSec) / point.heartRate!)
  )
}

function evidenceFromSampleCount(count: number): AdvancedInsightEvidenceLevel {
  if (count >= 80) return "strong"
  if (count >= 30) return "medium"
  return "weak"
}

function buildUnavailableInsight(
  key: RunningAdvancedInsight["key"],
  title: string,
  requiredFields: string[],
  failureReason: string
): RunningAdvancedInsight {
  return {
    key,
    title,
    available: false,
    experimental: true,
    evidenceLevel: "weak",
    requiredFields,
    failureReason,
  }
}

function analyzeCardiacDecoupling(input: RunningSessionInput): RunningAdvancedInsight {
  const telemetry = (input.telemetry ?? []).filter((point) => point.heartRate !== undefined)
  if (telemetry.length < 20) {
    return buildUnavailableInsight(
      "cardiac-decoupling",
      "心率解耦",
      ["telemetry.paceSec", "telemetry.heartRate"],
      "缺少足够的配速 + 心率时序数据。"
    )
  }

  const midpoint = Math.floor(telemetry.length / 2)
  const firstHalf = telemetry.slice(0, midpoint)
  const secondHalf = telemetry.slice(midpoint)
  const firstEfficiency = paceEfficiency(firstHalf)
  const secondEfficiency = paceEfficiency(secondHalf)
  const decouplingPct = firstEfficiency === 0 ? 0 : ((firstEfficiency - secondEfficiency) / firstEfficiency) * 100

  return {
    key: "cardiac-decoupling",
    title: "心率解耦",
    available: true,
    experimental: true,
    evidenceLevel: evidenceFromSampleCount(telemetry.length),
    requiredFields: ["telemetry.paceSec", "telemetry.heartRate"],
    summary:
      decouplingPct <= 5
        ? `解耦约 ${decouplingPct.toFixed(1)}%，有氧稳定性较好。`
        : `解耦约 ${decouplingPct.toFixed(1)}%，后半程效率明显下降。`,
    data: {
      decouplingPct: Number(decouplingPct.toFixed(1)),
      firstHalfEfficiency: Number(firstEfficiency.toFixed(3)),
      secondHalfEfficiency: Number(secondEfficiency.toFixed(3)),
    },
  }
}

function analyzeLactateThreshold(input: RunningSessionInput): RunningAdvancedInsight {
  const telemetry = (input.telemetry ?? []).filter((point) => point.heartRate !== undefined)
  if (telemetry.length < 30 || input.avgHeartRate === undefined || input.maxHeartRate === undefined) {
    return buildUnavailableInsight(
      "lactate-threshold",
      "乳酸阈估计",
      ["telemetry.paceSec", "telemetry.heartRate", "avgHeartRate", "maxHeartRate"],
      "缺少足够强度样本，无法做稳定阈值估计。"
    )
  }

  const thresholdWindow = telemetry
    .filter((point) => point.heartRate! / input.maxHeartRate! >= 0.82)
    .sort((left, right) => left.paceSec - right.paceSec)

  if (thresholdWindow.length < 10) {
    return buildUnavailableInsight(
      "lactate-threshold",
      "乳酸阈估计",
      ["telemetry.paceSec", "telemetry.heartRate"],
      "高强度样本不足，阈值结果会失真。"
    )
  }

  const paceSec = average(thresholdWindow.slice(0, Math.ceil(thresholdWindow.length / 2)).map((point) => point.paceSec))
  const thresholdHr = Math.round(average(thresholdWindow.map((point) => point.heartRate!)))

  return {
    key: "lactate-threshold",
    title: "乳酸阈估计",
    available: true,
    experimental: true,
    evidenceLevel: evidenceFromSampleCount(thresholdWindow.length),
    requiredFields: ["telemetry.paceSec", "telemetry.heartRate"],
    summary: `估计阈值约 ${Math.floor(paceSec / 60)}:${String(Math.round(paceSec % 60)).padStart(2, "0")}/km，阈值心率约 ${thresholdHr} bpm。`,
    data: {
      thresholdPaceSec: Math.round(paceSec),
      thresholdHeartRate: thresholdHr,
    },
  }
}

function analyzeBiomechanicalDecay(input: RunningSessionInput): RunningAdvancedInsight {
  const telemetry = (input.telemetry ?? []).filter(
    (point) => point.cadence !== undefined || point.groundContactTimeMs !== undefined
  )

  if (telemetry.length < 20) {
    return buildUnavailableInsight(
      "biomechanical-decay",
      "生物力学衰减",
      ["telemetry.cadence or telemetry.groundContactTimeMs"],
      "缺少步频或触地时间序列。"
    )
  }

  const chunk = Math.max(4, Math.floor(telemetry.length / 4))
  const first = telemetry.slice(0, chunk)
  const last = telemetry.slice(-chunk)

  const firstCadence = average(first.map((point) => point.cadence).filter((value): value is number => value !== undefined))
  const lastCadence = average(last.map((point) => point.cadence).filter((value): value is number => value !== undefined))
  const firstGct = average(first.map((point) => point.groundContactTimeMs).filter((value): value is number => value !== undefined))
  const lastGct = average(last.map((point) => point.groundContactTimeMs).filter((value): value is number => value !== undefined))

  const cadenceDropPct = firstCadence > 0 ? ((lastCadence - firstCadence) / firstCadence) * 100 : 0
  const gctIncreaseMs = firstGct > 0 ? lastGct - firstGct : 0

  return {
    key: "biomechanical-decay",
    title: "生物力学衰减",
    available: true,
    experimental: true,
    evidenceLevel: evidenceFromSampleCount(telemetry.length),
    requiredFields: ["telemetry.cadence or telemetry.groundContactTimeMs"],
    summary:
      cadenceDropPct < -4 || gctIncreaseMs > 15
        ? `后程动作出现衰减：步频下降 ${Math.abs(cadenceDropPct).toFixed(1)}%，触地时间增加 ${gctIncreaseMs.toFixed(0)} ms。`
        : "没有看到明显的后程动作衰减。",
    data: {
      cadenceDropPct: Number(cadenceDropPct.toFixed(1)),
      groundContactIncreaseMs: Number(gctIncreaseMs.toFixed(1)),
    },
  }
}

export function hasAdvancedInsightsData(input: RunningSessionInput) {
  return Boolean(input.telemetry?.length)
}

export function analyzeRunningAdvancedInsights(input: RunningSessionInput): RunningAdvancedInsightBundle {
  const insights = [
    analyzeCardiacDecoupling(input),
    analyzeLactateThreshold(input),
    analyzeBiomechanicalDecay(input),
  ]

  return {
    available: insights.some((insight) => insight.available),
    insights,
  }
}
