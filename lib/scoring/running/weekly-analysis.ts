import { calculateRunningConfidence } from "./confidence"
import { calculateRunningScore } from "./engine"
import type {
  RunningSessionInput,
  WeeklyComparison,
  WeeklyTrainingBlock,
  WeeklyTrainingSessionSummary,
} from "./schemas"

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function percentChange(previous: number, next: number) {
  if (previous === 0) return 0
  return ((next - previous) / previous) * 100
}

function buildSessionSummaries(sessions: RunningSessionInput[]): WeeklyTrainingSessionSummary[] {
  return sessions.map((input) => ({
    input,
    report: calculateRunningScore(input),
  }))
}

function buildPatterns(sessions: WeeklyTrainingSessionSummary[], intensityBalance: WeeklyTrainingBlock["structure"]["intensityBalance"]) {
  const patterns: string[] = []
  const majorDeviationCount = sessions.reduce(
    (count, session) => count + session.report.detectedDeviations.filter((deviation) => deviation.severity === "major").length,
    0
  )

  if (majorDeviationCount >= 2) {
    patterns.push("本周出现了多次明显跑偏，需要先收缩训练质量再谈加量。")
  }

  if (sessions.filter((session) => session.input.trainingType === "easy" || session.input.trainingType === "recovery").some((session) => session.report.detectedDeviations.some((deviation) => deviation.code === "easy_gray_zone" || deviation.code === "recovery_not_easy"))) {
    patterns.push("恢复性训练没有真正放轻，周结构的恢复槽位被挤压了。")
  }

  if (sessions.filter((session) => session.input.trainingType === "long").some((session) => session.report.detectedDeviations.some((deviation) => deviation.code === "long_run_fade"))) {
    patterns.push("长距离后半程控制不足，耐力基础仍需继续补。")
  }

  if (intensityBalance === "too_much_intensity") {
    patterns.push("高质量课比重偏高，本周更像在追刺激而不是构建结构。")
  }

  if (patterns.length === 0) {
    patterns.push("周结构基本健康，没有出现明显的系统性跑偏。")
  }

  return patterns
}

function buildNextWeekFocus(block: WeeklyTrainingBlock): string[] {
  const focus: string[] = []

  if (block.structure.intensityBalance === "too_much_intensity") {
    focus.push("下周先把高质量课数量收回到 1-2 次，给轻松跑和恢复日让路。")
  }

  if (!block.structure.longRunCompleted) {
    focus.push("下周补上一节稳定完成的长距离，优先练后半程不掉速。")
  }

  if (block.scoreSummary.averageLoadQuality < 70) {
    focus.push("先修正负荷落点，尤其避免把轻松跑和恢复跑做重。")
  }

  if (focus.length === 0) {
    focus.push("下周延续当前结构，只做小幅递进，不要同时加量又加速。")
  }

  return focus.slice(0, 3)
}

function buildBlockVerdict(averageFinalScore: number, intensityBalance: WeeklyTrainingBlock["structure"]["intensityBalance"]) {
  if (averageFinalScore >= 80 && intensityBalance === "balanced") {
    return "这周整体练对了，结构和单次质量都比较稳定。"
  }

  if (averageFinalScore < 65) {
    return "这周更多是在消耗而不是积累，需要先把训练质量拉回正轨。"
  }

  return "这周有价值，但结构上还有明显可修正空间。"
}

export function aggregateWeeklyData(sessions: RunningSessionInput[], weekStart: string, weekEnd: string): WeeklyTrainingBlock {
  const inWeek = sessions
    .filter((session) => {
      const date = new Date(session.date)
      return date >= new Date(weekStart) && date <= new Date(weekEnd)
    })
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

  const summaries = buildSessionSummaries(inWeek)
  const totalDistanceKm = round(inWeek.reduce((sum, session) => sum + session.distanceKm, 0))
  const totalDurationMin = Math.round(inWeek.reduce((sum, session) => sum + session.durationMin, 0))
  const sessionDays = new Set(inWeek.map((session) => new Date(session.date).toISOString().slice(0, 10))).size

  const easyDistance = inWeek
    .filter((session) => session.trainingType === "easy" || session.trainingType === "recovery")
    .reduce((sum, session) => sum + session.distanceKm, 0)

  const qualityDistance = inWeek
    .filter((session) => session.trainingType === "tempo" || session.trainingType === "interval" || session.trainingType === "race")
    .reduce((sum, session) => sum + session.distanceKm, 0)

  const longRunCompleted = inWeek.some((session) => session.trainingType === "long" && session.durationMin >= 80)
  const easySharePct = totalDistanceKm > 0 ? round((easyDistance / totalDistanceKm) * 100) : 0
  const qualitySharePct = totalDistanceKm > 0 ? round((qualityDistance / totalDistanceKm) * 100) : 0

  let intensityBalance: WeeklyTrainingBlock["structure"]["intensityBalance"] = "balanced"
  if (!longRunCompleted && totalDistanceKm >= 25) intensityBalance = "missing_long_run"
  else if (qualitySharePct > 28) intensityBalance = "too_much_intensity"
  else if (qualitySharePct < 8 && inWeek.length >= 4) intensityBalance = "too_little_intensity"
  else if (new Set(inWeek.map((session) => session.trainingType)).size <= 2 && inWeek.length >= 4) intensityBalance = "monotonous"

  const averageFinalScore = round(average(summaries.map((session) => session.report.scoreBreakdown.final.score)))
  const averageCompletion = round(average(summaries.map((session) => session.report.scoreBreakdown.completion.score)))
  const averagePacingControl = round(average(summaries.map((session) => session.report.scoreBreakdown.pacingControl.score)))
  const averageLoadQuality = round(average(summaries.map((session) => session.report.scoreBreakdown.loadQuality.score)))
  const averageGoalValue = round(average(summaries.map((session) => session.report.scoreBreakdown.goalValue.score)))

  const patterns = buildPatterns(summaries, intensityBalance)
  const strongest = [...summaries].sort((left, right) => right.report.scoreBreakdown.final.score - left.report.scoreBreakdown.final.score)[0]
  const weakest = [...summaries].sort((left, right) => left.report.scoreBreakdown.final.score - right.report.scoreBreakdown.final.score)[0]

  const confidence = calculateRunningConfidence(
    {
      id: "weekly-summary",
      date: weekEnd,
      trainingType: "easy",
      durationMin: totalDurationMin || 1,
      distanceKm: totalDistanceKm || 0.1,
      avgPaceSec: totalDistanceKm > 0 ? (totalDurationMin * 60) / totalDistanceKm : 600,
      source: "imported",
    },
    {
      avgPaceSec: totalDistanceKm > 0 ? (totalDurationMin * 60) / totalDistanceKm : 600,
      splitCount: 0,
      paceVariancePct: 0,
      telemetryPointCount: 0,
    }
  )

  const block: WeeklyTrainingBlock = {
    weekStart,
    weekEnd,
    sessions: summaries,
    totals: {
      totalDistanceKm,
      totalDurationMin,
      sessionsCount: inWeek.length,
      restDays: Math.max(0, 7 - sessionDays),
    },
    structure: {
      easySharePct,
      qualitySharePct,
      longRunCompleted,
      intensityBalance,
    },
    scoreSummary: {
      averageFinalScore,
      averageCompletion,
      averagePacingControl,
      averageLoadQuality,
      averageGoalValue,
    },
    findings: {
      blockVerdict: buildBlockVerdict(averageFinalScore, intensityBalance),
      strongestWeekSignal: strongest ? `${strongest.input.trainingType} 执行最稳，单次得分 ${strongest.report.scoreBreakdown.final.score}。` : "本周暂无训练记录。",
      biggestWeekCorrection: weakest ? weakest.report.biggestCorrection.detail : "先补齐本周训练记录。",
      detectedPatterns: patterns,
    },
    nextWeekFocus: [],
    confidence: {
      ...confidence,
      reasons: ["周分析由单次报告聚合得出，更适合看结构，不适合替代单次细判。"],
    },
  }

  block.nextWeekFocus = buildNextWeekFocus(block)
  return block
}

export function compareWeeks(current: WeeklyTrainingBlock, previous: WeeklyTrainingBlock | null): WeeklyComparison {
  if (!previous) {
    return {
      current,
      previous: null,
      changes: {
        distanceChangePct: 0,
        durationChangePct: 0,
        scoreChange: 0,
      },
      insights: ["这是第一周可用记录，后续周复盘会显示环比变化。"],
    }
  }

  const distanceChangePct = round(percentChange(previous.totals.totalDistanceKm, current.totals.totalDistanceKm))
  const durationChangePct = round(percentChange(previous.totals.totalDurationMin, current.totals.totalDurationMin))
  const scoreChange = round(current.scoreSummary.averageFinalScore - previous.scoreSummary.averageFinalScore)
  const insights: string[] = []

  if (Math.abs(distanceChangePct) > 20) {
    insights.push(distanceChangePct > 0 ? `本周跑量较上周增加 ${distanceChangePct}%，注意不要在疲劳上继续堆量。` : `本周跑量较上周下降 ${Math.abs(distanceChangePct)}%，确认这是主动减量而不是状态被动下滑。`)
  }

  if (scoreChange >= 6) {
    insights.push("单次训练平均质量较上周更稳，说明执行层面在变好。")
  } else if (scoreChange <= -6) {
    insights.push("单次训练平均质量较上周下滑，建议先查找是哪一类课开始跑偏。")
  }

  if (current.structure.intensityBalance !== previous.structure.intensityBalance) {
    insights.push(`周结构从 ${previous.structure.intensityBalance} 变为 ${current.structure.intensityBalance}。`)
  }

  if (insights.length === 0) {
    insights.push("本周与上周结构接近，属于稳定推进。")
  }

  return {
    current,
    previous,
    changes: {
      distanceChangePct,
      durationChangePct,
      scoreChange,
    },
    insights,
  }
}
