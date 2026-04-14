import {
  analyzeRunningAdvancedInsights,
  calculateRunningScore,
  type RunningGoalType,
  type RunningScoreReport,
  type RunningSessionInput,
  type RunningTelemetryPoint,
  type RunningTrainingType,
} from "./scoring/running"
import type { RunningAdvancedInsight, RunningAdvancedInsightBundle } from "./scoring/running/advanced/types"

export type LegacyRunningGoal = "base_building" | "threshold" | "speed" | "recovery" | "race"

export interface RunningDataPoint {
  timestamp: number
  distance: number
  pace: number
  heartRate: number
  cadence?: number
  elevation?: number
  groundContactTime?: number
  verticalOscillation?: number
  strideLength?: number
}

export interface RunningSession {
  id: string
  date: string
  totalDistance: number
  totalTime: number
  avgPace: number
  avgHeartRate: number
  maxHeartRate: number
  avgCadence?: number
  avgGroundContactTime?: number
  elevationGain?: number
  dataPoints: RunningDataPoint[]
  runnerProfile?: {
    maxHR?: number
    restHR?: number
    height?: number
    lactateThresholdPace?: number
    baseline?: {
      freshStateCadence?: number
      freshStateGCT?: number
      optimalStrideLength?: number
    }
  }
  trainingGoal?: RunningTrainingType | LegacyRunningGoal
  perceivedExertion?: number
}

export interface HRDecouplingResult {
  decouplingPercent: number
  firstHalfRatio: number
  secondHalfRatio: number
  status: "excellent" | "good" | "fair" | "poor" | "critical"
  insight: string
}

export interface LactateThresholdResult {
  detected: boolean
  thresholdHR?: number
  thresholdPace?: number
  confidence: number
  timeInThresholdZone: number
  sustainability: number
}

export interface BiomechanicalResult {
  cadenceDrop: number
  gctIncrease: number
  strideLengthChange: number
  compensationPattern: "none" | "mild" | "overstriding" | "dangerous_overstriding"
  severity: "low" | "moderate" | "high" | "critical"
  insight: string
}

export interface TrainingPrescription {
  primaryFocus: string
  intensity: "recovery" | "easy" | "moderate" | "threshold" | "interval"
  duration: string
  targetZone: { min: number; max: number }
  constraints: string[]
  rationale: string
}

export interface RunningAnalysisResult {
  summary: {
    totalDistance: number
    duration: number
    avgPace: number
    avgHeartRate: number
    maxHeartRate: number
    elevationGain: number
  }
  layers: {
    cardiac: HRDecouplingResult
    threshold: LactateThresholdResult
    biomechanical: BiomechanicalResult
  }
  prescription: TrainingPrescription
  dataQuality: {
    outliersRemoved: number
    gapsInterpolated: number
    confidenceScore: number
  }
}

export interface RunningAnalysisPayload {
  session: RunningSession
  input: RunningSessionInput
  report: RunningScoreReport
  advancedInsights: RunningAdvancedInsightBundle
  sessionSummary: {
    distance: number
    duration: number
    avgPace: number
    avgHeartRate: number
  }
  runnerProfile: {
    targetRace: string
    targetTime: string
    runningExperience: "recreational" | "competitive" | "elite"
  }
  advancedMetrics: {
    aerobicDecoupling: {
      decouplingRate: number
      status: HRDecouplingResult["status"]
    }
    lactateThreshold: {
      thresholdPace: number
      thresholdHeartRate: number
      sustainability: number
    }
    biomechanicalDecay: {
      decayDetected: boolean
      cadenceDelta: number
      gctDelta: number
      compensationPattern: BiomechanicalResult["compensationPattern"]
      injuryRisk: "low" | "medium" | "high" | "critical"
    }
  }
}

export interface EliteRunningReport {
  summary: {
    overallScore: number
    verdict: string
    shouldRace: boolean
    oneLiner: string
  }
  layer1_aerobic: {
    decouplingRate: number
    firstHalf: { efficiencyRatio: number }
    secondHalf: { efficiencyRatio: number }
    cardiacDrift: number
    oneLiner: string
  }
  layer2_threshold: {
    thresholdPace: number
    thresholdHR: number
    timeInThresholdZone: number
    sustainability: number
    inflectionPoint?: { distance: number }
    oneLiner: string
  }
  layer3_biomechanics: {
    decayDetected: boolean
    compensationPattern: BiomechanicalResult["compensationPattern"] | "unknown"
    injuryRisk: "low" | "medium" | "high" | "critical"
    decaySeverity: BiomechanicalResult["severity"]
    changes: {
      cadenceDelta: number
      gctDelta: number
    }
    oneLiner: string
  }
  trainingPrescription: {
    currentLoad: string
    nextSession: string
    recoveryNeeds: string
  }
  aiPayload: RunningAnalysisPayload
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizePaceSec(rawPace: number) {
  return rawPace > 30 ? rawPace : rawPace * 60
}

function inferTrainingTypeFromGoal(goal: RunningSession["trainingGoal"], session: RunningSession): RunningTrainingType {
  if (goal === "recovery") return "recovery"
  if (goal === "threshold") return "tempo"
  if (goal === "speed") return "interval"
  if (goal === "race") return "race"
  if (goal && ["easy", "recovery", "tempo", "interval", "long", "race"].includes(goal)) {
    return goal as RunningTrainingType
  }
  if (session.totalDistance >= 18) return "long"
  if (session.totalTime >= 75 * 60) return "long"
  return "easy"
}

function inferGoalType(session: RunningSession): RunningGoalType {
  if (session.totalDistance >= 35) return "marathon"
  if (session.totalDistance >= 18) return "half"
  if (session.totalDistance >= 8) return "10k"
  return "5k"
}

function buildTelemetry(dataPoints: RunningDataPoint[]): RunningTelemetryPoint[] {
  return dataPoints.map((point, index) => ({
    timestampSec: index === 0 ? 0 : Math.max(0, (point.timestamp - dataPoints[0].timestamp) / 1000),
    distanceKm: point.distance / 1000,
    paceSec: normalizePaceSec(point.pace),
    heartRate: point.heartRate,
    cadence: point.cadence,
    groundContactTimeMs: point.groundContactTime,
    verticalOscillationCm: point.verticalOscillation,
    strideLengthM: point.strideLength,
  }))
}

function buildSessionFromDataPoints(
  rawData: RunningDataPoint[],
  goal: LegacyRunningGoal = "base_building"
): RunningSession {
  const telemetry = buildTelemetry(rawData)
  const avgPaceSec = average(telemetry.map((point) => point.paceSec))
  const avgHeartRate = Math.round(average(rawData.map((point) => point.heartRate)))
  const avgCadence = Math.round(average(rawData.map((point) => point.cadence).filter((value): value is number => value !== undefined)))
  const avgGroundContactTime = Math.round(
    average(rawData.map((point) => point.groundContactTime).filter((value): value is number => value !== undefined))
  )

  return {
    id: "legacy-running-session",
    date: new Date().toISOString(),
    totalDistance: rawData.at(-1)?.distance ?? 0,
    totalTime:
      rawData.length > 1 ? Math.round((rawData.at(-1)!.timestamp - rawData[0]!.timestamp) / 1000) : rawData.length * 10,
    avgPace: Math.round(avgPaceSec),
    avgHeartRate,
    maxHeartRate: Math.max(...rawData.map((point) => point.heartRate)),
    avgCadence,
    avgGroundContactTime,
    elevationGain: Math.max(0, Math.round(average(rawData.map((point) => point.elevation ?? 0)))),
    dataPoints: rawData,
    trainingGoal: goal,
    perceivedExertion: 6,
  }
}

function buildSessionInput(session: RunningSession): RunningSessionInput {
  const telemetry = buildTelemetry(session.dataPoints)
  const trainingType = inferTrainingTypeFromGoal(session.trainingGoal, session)
  const splits = telemetry
    .filter((point, index) => index === 0 || Math.floor(point.distanceKm) > Math.floor(telemetry[index - 1]!.distanceKm))
    .map((point) => point.paceSec)

  return {
    id: session.id,
    date: session.date,
    trainingType,
    goalType: inferGoalType(session),
    durationMin: Math.max(1, Math.round(session.totalTime / 60)),
    distanceKm: Number((session.totalDistance / 1000).toFixed(2)),
    avgPaceSec: Math.round(session.avgPace),
    splits: splits.length > 0 ? splits : undefined,
    avgHeartRate: session.avgHeartRate || undefined,
    maxHeartRate: session.maxHeartRate || session.runnerProfile?.maxHR,
    heartRateSeries: telemetry.map((point) => point.heartRate).filter((value): value is number => value !== undefined),
    rpe: session.perceivedExertion,
    plannedDistance: trainingType === "long" ? Number((session.totalDistance / 1000).toFixed(2)) : undefined,
    source: "watch",
    telemetry,
  }
}

function getAdvancedInsight(bundle: RunningAdvancedInsightBundle, key: RunningAdvancedInsight["key"]) {
  return bundle.insights.find((insight) => insight.key === key)
}

function buildCardiacResult(bundle: RunningAdvancedInsightBundle): HRDecouplingResult {
  const insight = getAdvancedInsight(bundle, "cardiac-decoupling")
  const decouplingPercent = Number(insight?.data?.decouplingPct ?? 0)
  const status: HRDecouplingResult["status"] =
    decouplingPercent <= 5 ? "excellent" : decouplingPercent <= 8 ? "good" : decouplingPercent <= 12 ? "fair" : decouplingPercent <= 18 ? "poor" : "critical"

  return {
    decouplingPercent,
    firstHalfRatio: Number(insight?.data?.firstHalfEfficiency ?? 0),
    secondHalfRatio: Number(insight?.data?.secondHalfEfficiency ?? 0),
    status,
    insight:
      insight?.summary ??
      "Advanced cardiac drift data is limited. The main score is still based on pacing, completion, and load control.",
  }
}

function buildThresholdResult(bundle: RunningAdvancedInsightBundle): LactateThresholdResult {
  const insight = getAdvancedInsight(bundle, "lactate-threshold")
  const pace = Number(insight?.data?.thresholdPaceSec ?? 0)
  const heartRate = Number(insight?.data?.thresholdHeartRate ?? 0)
  const confidence = insight?.available ? (insight.evidenceLevel === "strong" ? 82 : insight.evidenceLevel === "medium" ? 64 : 45) : 0

  return {
    detected: Boolean(insight?.available),
    thresholdHR: heartRate || undefined,
    thresholdPace: pace || undefined,
    confidence,
    timeInThresholdZone: heartRate > 0 ? 12 : 0,
    sustainability: Math.max(35, Math.min(90, 100 - Math.round(pace / 12))),
  }
}

function buildBiomechanicalResult(bundle: RunningAdvancedInsightBundle): BiomechanicalResult {
  const insight = getAdvancedInsight(bundle, "biomechanical-decay")
  const cadenceDrop = Number(insight?.data?.cadenceDropPct ?? 0)
  const gctIncrease = Number(insight?.data?.groundContactIncreaseMs ?? 0)
  const severity: BiomechanicalResult["severity"] =
    cadenceDrop <= -8 || gctIncrease >= 25
      ? "critical"
      : cadenceDrop <= -5 || gctIncrease >= 15
        ? "high"
        : cadenceDrop <= -3 || gctIncrease >= 8
          ? "moderate"
          : "low"
  const compensationPattern: BiomechanicalResult["compensationPattern"] =
    severity === "critical"
      ? "dangerous_overstriding"
      : severity === "high"
        ? "overstriding"
        : severity === "moderate"
          ? "mild"
          : "none"

  return {
    cadenceDrop,
    gctIncrease,
    strideLengthChange: 0,
    compensationPattern,
    severity,
    insight:
      insight?.summary ??
      "No strong biomechanical decay signal was detected. These metrics remain optional and do not drive the main score.",
  }
}

function buildPrescription(report: RunningScoreReport, cardiac: HRDecouplingResult): TrainingPrescription {
  const load = report.scoreBreakdown.loadQuality.score
  const nextAction = report.biggestCorrection.detail
  const intensity: TrainingPrescription["intensity"] =
    load < 60 || cardiac.status === "poor" || cardiac.status === "critical"
      ? "recovery"
      : report.inputEcho.trainingType === "interval"
        ? "easy"
        : report.inputEcho.trainingType === "tempo"
          ? "moderate"
          : "easy"

  return {
    primaryFocus: report.biggestCorrection.title,
    intensity,
    duration: intensity === "recovery" ? "20-35 min" : intensity === "easy" ? "35-60 min" : "40-50 min",
    targetZone: intensity === "recovery" ? { min: 120, max: 140 } : intensity === "easy" ? { min: 130, max: 150 } : { min: 145, max: 165 },
    constraints: report.detectedDeviations.slice(0, 2).map((item) => item.action),
    rationale: nextAction,
  }
}

function buildPayload(
  session: RunningSession,
  input: RunningSessionInput,
  report: RunningScoreReport,
  advancedInsights: RunningAdvancedInsightBundle,
  cardiac: HRDecouplingResult,
  threshold: LactateThresholdResult,
  biomechanical: BiomechanicalResult
): RunningAnalysisPayload {
  const injuryRisk =
    biomechanical.severity === "critical"
      ? "critical"
      : biomechanical.severity === "high"
        ? "high"
        : biomechanical.severity === "moderate"
          ? "medium"
          : "low"

  return {
    session,
    input,
    report,
    advancedInsights,
    sessionSummary: {
      distance: Number((session.totalDistance / 1000).toFixed(2)),
      duration: session.totalTime,
      avgPace: session.avgPace,
      avgHeartRate: session.avgHeartRate,
    },
    runnerProfile: {
      targetRace: input.goalType ?? "general",
      targetTime: "not specified",
      runningExperience: "competitive",
    },
    advancedMetrics: {
      aerobicDecoupling: {
        decouplingRate: cardiac.decouplingPercent,
        status: cardiac.status,
      },
      lactateThreshold: {
        thresholdPace: threshold.thresholdPace ?? 0,
        thresholdHeartRate: threshold.thresholdHR ?? 0,
        sustainability: threshold.sustainability,
      },
      biomechanicalDecay: {
        decayDetected: biomechanical.severity !== "low",
        cadenceDelta: Number(biomechanical.cadenceDrop.toFixed(1)),
        gctDelta: Number(biomechanical.gctIncrease.toFixed(1)),
        compensationPattern: biomechanical.compensationPattern,
        injuryRisk,
      },
    },
  }
}

export function analyzeRunningWorkout(
  rawData: RunningDataPoint[],
  goal: LegacyRunningGoal = "base_building"
): RunningAnalysisResult {
  const session = buildSessionFromDataPoints(rawData, goal)
  const input = buildSessionInput(session)
  const report = calculateRunningScore(input)
  const advancedInsights = analyzeRunningAdvancedInsights(input)
  const cardiac = buildCardiacResult(advancedInsights)
  const threshold = buildThresholdResult(advancedInsights)
  const biomechanical = buildBiomechanicalResult(advancedInsights)

  return {
    summary: {
      totalDistance: session.totalDistance,
      duration: session.totalTime,
      avgPace: Number((input.avgPaceSec! / 60).toFixed(2)),
      avgHeartRate: session.avgHeartRate,
      maxHeartRate: session.maxHeartRate,
      elevationGain: session.elevationGain ?? 0,
    },
    layers: {
      cardiac,
      threshold,
      biomechanical,
    },
    prescription: buildPrescription(report, cardiac),
    dataQuality: {
      outliersRemoved: 0,
      gapsInterpolated: 0,
      confidenceScore: report.confidence.score,
    },
  }
}

export function generateEliteRunningReport(
  session: RunningSession,
  goal?: LegacyRunningGoal
): EliteRunningReport {
  const normalizedSession = goal ? { ...session, trainingGoal: goal } : session
  const input = buildSessionInput(normalizedSession)
  const report = calculateRunningScore(input)
  const advancedInsights = analyzeRunningAdvancedInsights(input)
  const cardiac = buildCardiacResult(advancedInsights)
  const threshold = buildThresholdResult(advancedInsights)
  const biomechanical = buildBiomechanicalResult(advancedInsights)
  const payload = buildPayload(normalizedSession, input, report, advancedInsights, cardiac, threshold, biomechanical)

  return {
    summary: {
      overallScore: report.scoreBreakdown.final.score,
      verdict: report.scoreBreakdown.final.verdict,
      shouldRace: report.scoreBreakdown.final.score >= 78 && !report.detectedDeviations.some((item) => item.severity === "major"),
      oneLiner: report.strongestSignal.detail,
    },
    layer1_aerobic: {
      decouplingRate: cardiac.decouplingPercent,
      firstHalf: { efficiencyRatio: cardiac.firstHalfRatio },
      secondHalf: { efficiencyRatio: cardiac.secondHalfRatio },
      cardiacDrift: Math.max(0, normalizedSession.avgHeartRate - (input.avgHeartRate ?? normalizedSession.avgHeartRate)),
      oneLiner: cardiac.insight,
    },
    layer2_threshold: {
      thresholdPace: threshold.thresholdPace ?? input.avgPaceSec ?? normalizedSession.avgPace,
      thresholdHR: threshold.thresholdHR ?? input.avgHeartRate ?? normalizedSession.avgHeartRate,
      timeInThresholdZone: threshold.timeInThresholdZone,
      sustainability: threshold.sustainability,
      inflectionPoint: normalizedSession.totalDistance > 0 ? { distance: Number((normalizedSession.totalDistance / 2000).toFixed(1)) } : undefined,
      oneLiner:
        threshold.detected && threshold.thresholdPace
          ? `Threshold estimate is available, but it stays in the Advanced Insights layer and does not affect the main score.`
          : "Threshold estimate hidden because the telemetry sample is too thin.",
    },
    layer3_biomechanics: {
      decayDetected: biomechanical.severity !== "low",
      compensationPattern: biomechanical.severity !== "low" ? biomechanical.compensationPattern : "unknown",
      injuryRisk:
        biomechanical.severity === "critical"
          ? "critical"
          : biomechanical.severity === "high"
            ? "high"
            : biomechanical.severity === "moderate"
              ? "medium"
              : "low",
      decaySeverity: biomechanical.severity,
      changes: {
        cadenceDelta: Number(biomechanical.cadenceDrop.toFixed(1)),
        gctDelta: Number(biomechanical.gctIncrease.toFixed(1)),
      },
      oneLiner: biomechanical.insight,
    },
    trainingPrescription: {
      currentLoad: report.scoreBreakdown.loadQuality.verdict,
      nextSession: report.nextSessionSuggestions[0] ?? "Keep the next run simple and controlled.",
      recoveryNeeds:
        report.detectedDeviations.some((item) => item.code === "overload_under_recovered")
          ? "Prioritize 24-48h recovery before the next quality session."
          : "Standard recovery is enough if legs feel normal the next day.",
    },
    aiPayload: payload,
  }
}

export interface RunningAIPromptContext {
  athleteProfile?: {
    name: string
    level: "recreational" | "competitive" | "elite"
    age?: number
    recentInjuries?: string[]
  }
  trainingHistory?: {
    weeklyMileage: number
    recentRaces: string[]
  }
  environmentalFactors?: {
    temperature: number
    humidity: number
    altitude: number
    windSpeed: number
  }
}

export function generateRunningAIPrompt(
  payload: RunningAnalysisPayload,
  context: RunningAIPromptContext = {}
): string {
  const lines = [
    "Analyze this running session without changing the main rule-based score.",
    "",
    "Main score is already decided by rules/statistics:",
    `- Final score: ${payload.report.scoreBreakdown.final.score}`,
    `- Verdict: ${payload.report.scoreBreakdown.final.verdict}`,
    `- Strongest signal: ${payload.report.strongestSignal.detail}`,
    `- Biggest correction: ${payload.report.biggestCorrection.detail}`,
    "",
    "Session summary:",
    `- Distance: ${payload.sessionSummary.distance} km`,
    `- Duration: ${Math.round(payload.sessionSummary.duration / 60)} min`,
    `- Avg pace: ${Math.floor(payload.sessionSummary.avgPace / 60)}:${String(Math.round(payload.sessionSummary.avgPace % 60)).padStart(2, "0")}/km`,
    `- Avg HR: ${payload.sessionSummary.avgHeartRate} bpm`,
    "",
    "Advanced insights (optional, never score-driving):",
    `- Cardiac decoupling: ${payload.advancedMetrics.aerobicDecoupling.decouplingRate}%`,
    `- Threshold pace: ${payload.advancedMetrics.lactateThreshold.thresholdPace || 0}s/km`,
    `- Biomechanical decay detected: ${payload.advancedMetrics.biomechanicalDecay.decayDetected ? "yes" : "no"}`,
  ]

  if (context.athleteProfile) {
    lines.push("", "Athlete profile:", `- Level: ${context.athleteProfile.level}`)
  }

  if (context.environmentalFactors) {
    lines.push("", "Environment:", `- Temperature: ${context.environmentalFactors.temperature}C`)
  }

  lines.push(
    "",
    "Return:",
    "1. A concise explanation of whether the training was done correctly",
    "2. The main execution problem",
    "3. One actionable next-session adjustment",
    "4. Mention advanced insights only if their evidence is strong enough"
  )

  return lines.join("\n")
}
