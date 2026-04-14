import type { RunningAnalysisPayload } from "./running-advanced-metrics"

export interface RunningPrescription {
  id: string
  category: "aerobic_base" | "lactate_threshold" | "strength" | "mobility" | "recovery"
  name: string
  description: string
  sets: string
  frequency: string
  purpose: string
  evidence?: string
}

export interface RunningCoachInsight {
  diagnosis: string
  rootCause: string
  trainingPrescriptions: RunningPrescription[]
  riskWarning?: string
  raceReadiness: "ready" | "close" | "not_ready" | "risky"
  timeline: string
}

const PRESCRIPTION_LIBRARY: Record<string, RunningPrescription> = {
  easy_reset: {
    id: "easy_reset",
    category: "recovery",
    name: "Easy reset run",
    description: "Keep the next run fully conversational and remove pace pressure.",
    sets: "1 run",
    frequency: "next session",
    purpose: "Bring intensity back under control before adding quality.",
  },
  aerobic_long: {
    id: "aerobic_long",
    category: "aerobic_base",
    name: "Controlled long aerobic run",
    description: "Run long, but protect the second half from fade by starting more conservatively.",
    sets: "70-100 min",
    frequency: "weekly",
    purpose: "Build durable aerobic support without drifting into survival mode.",
  },
  tempo_even: {
    id: "tempo_even",
    category: "lactate_threshold",
    name: "Even tempo rehearsal",
    description: "Use a shorter tempo block and hold the first half slightly easier than ego wants.",
    sets: "2 x 10-15 min",
    frequency: "weekly",
    purpose: "Fix front-loaded tempo execution and improve pace discipline.",
  },
  interval_control: {
    id: "interval_control",
    category: "lactate_threshold",
    name: "Shorter intervals with stricter recovery",
    description: "Reduce rep length or count so the final reps still match the intended quality.",
    sets: "6-8 controlled reps",
    frequency: "weekly",
    purpose: "Preserve interval quality instead of turning the session into sloppy fatigue.",
  },
  strength_form: {
    id: "strength_form",
    category: "strength",
    name: "Single-leg strength block",
    description: "Use simple single-leg and calf work to support late-run mechanics.",
    sets: "2-3 sets each",
    frequency: "2x per week",
    purpose: "Support form when fatigue starts to push mechanics apart.",
  },
}

function uniquePrescriptions(items: Array<RunningPrescription | undefined>) {
  const seen = new Set<string>()
  return items.filter((item): item is RunningPrescription => {
    if (!item || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function generateRunningCoachInsight(payload: RunningAnalysisPayload): RunningCoachInsight {
  const { report } = payload
  const deviationCodes = new Set(report.detectedDeviations.map((item) => item.code))
  const strongest = report.strongestSignal.detail
  const correction = report.biggestCorrection.detail

  const diagnosis =
    report.scoreBreakdown.final.score >= 85
      ? "The session stayed close to the intended training effect."
      : report.scoreBreakdown.final.score >= 70
        ? "The session was mostly right, but execution drifted away from the clean target."
        : "The session missed its intended training effect and turned into a different stimulus."

  const rootCause = deviationCodes.has("tempo_front_loaded")
    ? "The first half was too ambitious, so the quality you wanted later had no room to stay stable."
    : deviationCodes.has("interval_late_loss")
      ? "The session was prescribed as quality, but the back half turned into fatigue management."
      : deviationCodes.has("easy_gray_zone") || deviationCodes.has("recovery_not_easy")
        ? "Intensity crept above the purpose of the day, so recovery work stopped being recovery work."
        : deviationCodes.has("long_run_fade")
          ? "The second half cost too much, which usually means pacing discipline or durability did not hold."
          : deviationCodes.has("plan_under_completed")
            ? "The planned stimulus was only partially delivered, so the session gave less value than expected."
            : correction

  const trainingPrescriptions = uniquePrescriptions([
    deviationCodes.has("easy_gray_zone") || deviationCodes.has("recovery_not_easy") ? PRESCRIPTION_LIBRARY.easy_reset : undefined,
    deviationCodes.has("tempo_front_loaded") ? PRESCRIPTION_LIBRARY.tempo_even : undefined,
    deviationCodes.has("interval_late_loss") ? PRESCRIPTION_LIBRARY.interval_control : undefined,
    deviationCodes.has("long_run_fade") ? PRESCRIPTION_LIBRARY.aerobic_long : undefined,
    payload.advancedMetrics.biomechanicalDecay.decayDetected ? PRESCRIPTION_LIBRARY.strength_form : undefined,
  ]).slice(0, 3)

  const raceReadiness: RunningCoachInsight["raceReadiness"] =
    report.scoreBreakdown.final.score >= 85 && report.confidence.band !== "low"
      ? "ready"
      : report.scoreBreakdown.final.score >= 72
        ? "close"
        : deviationCodes.has("overload_under_recovered")
          ? "risky"
          : "not_ready"

  const riskWarning =
    deviationCodes.has("overload_under_recovered")
      ? "Recovery markers are weak relative to session load. Avoid stacking another hard run immediately."
      : payload.advancedMetrics.biomechanicalDecay.injuryRisk === "high" || payload.advancedMetrics.biomechanicalDecay.injuryRisk === "critical"
        ? "Late-session mechanics degraded enough to justify caution before the next hard workout."
        : undefined

  const timeline =
    deviationCodes.has("tempo_front_loaded") || deviationCodes.has("interval_late_loss")
      ? "1-2 weeks of cleaner execution is enough to see whether the session quality improves."
      : deviationCodes.has("long_run_fade")
        ? "2-4 weeks of better pacing and durability work should make the long run more stable."
        : deviationCodes.has("easy_gray_zone")
          ? "You can correct this immediately in the next easy run."
          : "Use the next 1-2 sessions to confirm the correction."

  return {
    diagnosis,
    rootCause: `${strongest} ${rootCause}`.trim(),
    trainingPrescriptions,
    riskWarning,
    raceReadiness,
    timeline,
  }
}

export function formatRunningCoachReport(insight: RunningCoachInsight): string {
  const lines = [
    "## Diagnosis",
    insight.diagnosis,
    "",
    "## Root Cause",
    insight.rootCause,
  ]

  if (insight.riskWarning) {
    lines.push("", "## Risk", insight.riskWarning)
  }

  if (insight.trainingPrescriptions.length > 0) {
    lines.push("", "## Prescriptions")
    insight.trainingPrescriptions.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} - ${item.description}`)
      lines.push(`   ${item.sets} | ${item.frequency} | ${item.purpose}`)
    })
  }

  lines.push("", "## Readiness", insight.raceReadiness, "", "## Timeline", insight.timeline)
  return lines.join("\n")
}

export function buildRunningSystemPrompt() {
  return [
    "You explain a running report that is already scored by rules.",
    "Do not change scores.",
    "Focus on whether the runner trained correctly, what drifted, and what to do next.",
    "Only mention advanced physiology or biomechanics when the evidence is strong enough.",
  ].join("\n")
}

export function buildRunningUserPrompt(payload: RunningAnalysisPayload) {
  return [
    `Training type: ${payload.input.trainingType}`,
    `Final score: ${payload.report.scoreBreakdown.final.score}`,
    `Strongest signal: ${payload.report.strongestSignal.detail}`,
    `Biggest correction: ${payload.report.biggestCorrection.detail}`,
    `Detected deviations: ${payload.report.detectedDeviations.map((item) => item.label).join(", ") || "none"}`,
    `Advanced decoupling: ${payload.advancedMetrics.aerobicDecoupling.decouplingRate}%`,
    "Explain whether this workout was executed correctly and what should change next.",
  ].join("\n")
}
