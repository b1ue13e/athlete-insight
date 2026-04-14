import { analyzeRunningAdvancedInsights } from "./advanced"
import { buildDisplayableAdvancedInsights } from "./advanced/adapter"
import type { RunningScoreReport, RunningSessionInput, WeeklyTrainingBlock } from "./schemas"
import { labelGoalType, labelTrainingType } from "./templates"
import { labelRunningIntensityBalance } from "./weekly-preview"

export interface RunningReportViewModel {
  hero: {
    trainingTypeLabel: string
    goalLabel?: string
    verdict: string
    isOnTarget: boolean
    finalScore: number
    scoreRange: string
    confidenceLabel: string
    confidenceReason?: string
  }
  dimensions: Array<{
    key: "completion" | "pacingControl" | "loadQuality" | "goalValue"
    label: string
    score: number
    verdict: string
    evidence: string[]
  }>
  diagnosis: {
    deviations: RunningScoreReport["detectedDeviations"]
    strongestSignal: RunningScoreReport["strongestSignal"]
    biggestCorrection: RunningScoreReport["biggestCorrection"]
  }
  suggestions: string[]
  advanced: ReturnType<typeof buildDisplayableAdvancedInsights>
  weeklyEntry?: {
    title: string
    summary: string
    href: string
  }
}

function rangeLabel(range: RunningScoreReport["scoreBreakdown"]["final"]["range"]) {
  switch (range) {
    case "excellent":
      return "练对了"
    case "on_target":
      return "基本练对"
    case "mixed":
      return "部分练对"
    default:
      return "这次没练到点上"
  }
}

function confidenceLabel(band: RunningScoreReport["confidence"]["band"]) {
  switch (band) {
    case "high":
      return "高"
    case "medium":
      return "中"
    default:
      return "低"
  }
}

function buildWeeklyEntrySummary(weeklyPreview?: WeeklyTrainingBlock) {
  if (!weeklyPreview || weeklyPreview.totals.sessionsCount === 0) {
    return "把这次训练放回本周结构里，判断最近是不是在持续练对。"
  }

  return `${weeklyPreview.findings.blockVerdict} · 本周 ${weeklyPreview.totals.sessionsCount} 次训练 · ${labelRunningIntensityBalance(
    weeklyPreview.structure.intensityBalance
  )}`
}

export function buildRunningReportViewModel(
  input: RunningSessionInput,
  report: RunningScoreReport,
  weeklyPreview?: WeeklyTrainingBlock
): RunningReportViewModel {
  const advancedBundle = analyzeRunningAdvancedInsights(input)

  return {
    hero: {
      trainingTypeLabel: labelTrainingType(report.inputEcho.trainingType),
      goalLabel: labelGoalType(report.inputEcho.goalType),
      verdict: report.scoreBreakdown.final.verdict,
      isOnTarget: report.scoreBreakdown.final.onTarget,
      finalScore: report.scoreBreakdown.final.score,
      scoreRange: rangeLabel(report.scoreBreakdown.final.range),
      confidenceLabel: confidenceLabel(report.confidence.band),
      confidenceReason: report.confidence.reasons[0],
    },
    dimensions: [
      { key: "completion", ...report.scoreBreakdown.completion },
      { key: "pacingControl", ...report.scoreBreakdown.pacingControl },
      { key: "loadQuality", ...report.scoreBreakdown.loadQuality },
      { key: "goalValue", ...report.scoreBreakdown.goalValue },
    ],
    diagnosis: {
      deviations: report.detectedDeviations,
      strongestSignal: report.strongestSignal,
      biggestCorrection: report.biggestCorrection,
    },
    suggestions: report.nextSessionSuggestions,
    advanced: buildDisplayableAdvancedInsights(advancedBundle),
    weeklyEntry: {
      title: "进入周训练块复盘",
      summary: buildWeeklyEntrySummary(weeklyPreview),
      href: "/analysis/running/weekly",
    },
  }
}
