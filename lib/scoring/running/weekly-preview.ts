import type { RunningSessionInput, WeeklyTrainingBlock } from "./schemas"
import { aggregateWeeklyData } from "./weekly-analysis"

export interface RunningWeekRange {
  startDate: string
  endDate: string
}

export interface RunningWeeklyPreview {
  range: RunningWeekRange
  block: WeeklyTrainingBlock
  hasSessions: boolean
  detail: string
}

function normalizeDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getRunningWeekRange(anchor: string | Date = new Date()): RunningWeekRange {
  const end = normalizeDate(anchor)
  const start = new Date(end)
  start.setDate(end.getDate() - 6)

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  }
}

export function mergeRunningSessions(
  sessions: RunningSessionInput[],
  currentSession?: RunningSessionInput | null
): RunningSessionInput[] {
  if (!currentSession) {
    return [...sessions]
  }

  return [currentSession, ...sessions.filter((session) => session.id !== currentSession.id)]
}

export function labelRunningIntensityBalance(balance: WeeklyTrainingBlock["structure"]["intensityBalance"]) {
  switch (balance) {
    case "too_much_intensity":
      return "强度偏多"
    case "too_little_intensity":
      return "强度偏少"
    case "missing_long_run":
      return "长距离缺失"
    case "monotonous":
      return "结构单一"
    default:
      return "结构平衡"
  }
}

export function buildRunningWeeklyPreview(
  sessions: RunningSessionInput[],
  anchor: string | Date = new Date()
): RunningWeeklyPreview {
  const range = getRunningWeekRange(anchor)
  const block = aggregateWeeklyData(sessions, range.startDate, range.endDate)
  const hasSessions = block.totals.sessionsCount > 0

  return {
    range,
    block,
    hasSessions,
    detail: hasSessions
      ? `本周 ${block.totals.sessionsCount} 次训练 · ${block.totals.totalDistanceKm} km · 平均 ${block.scoreSummary.averageFinalScore} 分`
      : "本周还没有形成可复盘的训练块",
  }
}
