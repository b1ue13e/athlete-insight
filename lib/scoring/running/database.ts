import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getAthleteById } from "../../athletes"
import { getAnalysisSessionById, getAnalysisSessions, saveRunningAnalysisSession, updateAnalysisSessionStatus, type AnalysisSessionRecord } from "../../analysis/session-store"
import type { RunningScoreReport, RunningSessionInput, WeeklyTrainingBlock } from "./schemas"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const hasValidConfig =
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== "your_supabase_project_url" &&
  supabaseKey !== "your_supabase_anon_key"

let cachedClient: SupabaseClient | null = null
const LOCAL_RUNNING_SESSIONS_KEY = "athlete_insight_running_sessions"
const LOCAL_WEEKLY_BLOCKS_KEY = "athlete_insight_running_weekly_blocks"

function createMockClient(): SupabaseClient {
  const mockError = new Error("Supabase not configured")
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: mockError }),
          order: () => ({ limit: () => Promise.resolve({ data: [], error: mockError }) }),
        }),
        order: () => ({ limit: () => Promise.resolve({ data: [], error: mockError }) }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: `mock-${Date.now()}` }, error: null }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: mockError }) }),
    }),
  } as unknown as SupabaseClient
}

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient
  if (!hasValidConfig) return createMockClient()
  cachedClient = createClient(supabaseUrl!, supabaseKey!)
  return cachedClient
}

export const supabase = getClient()

interface LocalWeeklyBlockRecord {
  id: string
  athleteId: string
  userId: string
  block: WeeklyTrainingBlock
}

function canUseLocalFallback() {
  return !hasValidConfig && typeof window !== "undefined"
}

function readLocalCollection<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeLocalCollection<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export interface DatabaseRunningSession {
  id: string
  athlete_id: string
  user_id: string
  sport_type: "running"
  title: string
  session_date: string
  status: "draft" | "processing" | "completed" | "failed"
  input_method: "manual" | "watch" | "imported"
  raw_input: RunningSessionInput
  overall_score: number
  report_json: RunningScoreReport
  summary_text: string
  model_version: string
  created_at: string
  updated_at: string
}

function buildSummaryText(report: RunningScoreReport) {
  const parts = [report.scoreBreakdown.final.verdict]
  if (report.detectedDeviations[0]) {
    parts.push(report.detectedDeviations[0].label)
  }
  parts.push(`confidence=${report.confidence.band}`)
  return parts.join(" | ")
}

export async function saveRunningSession(
  userId: string,
  athleteId: string,
  input: RunningSessionInput,
  report: RunningScoreReport
): Promise<{ success: boolean; id?: string; error?: string }> {
  const athlete = getAthleteById(athleteId)
  if (!athlete) {
    return { success: false, error: "Athlete not found" }
  }

  return saveRunningAnalysisSession({
    userId,
    athlete,
    input,
    report,
  })
}

export async function getRunningSessions(
  userId: string,
  options: { athleteId?: string; limit?: number } = {}
): Promise<{ success: boolean; sessions?: DatabaseRunningSession[]; error?: string }> {
  const result = await getAnalysisSessions({
    userId,
    athleteId: options.athleteId,
    sportType: "running",
    limit: options.limit ?? 20,
  })

  return {
    success: result.success,
    sessions: (result.sessions as DatabaseRunningSession[]) ?? undefined,
    error: result.error,
  }
}

export async function getRunningSession(
  sessionId: string
): Promise<{ success: boolean; session?: DatabaseRunningSession; error?: string }> {
  const result = await getAnalysisSessionById(sessionId)
  return {
    success: result.success,
    session: result.session as DatabaseRunningSession | undefined,
    error: result.error,
  }
}

export async function updateSessionStatus(
  sessionId: string,
  status: DatabaseRunningSession["status"]
): Promise<{ success: boolean; error?: string }> {
  return updateAnalysisSessionStatus(sessionId, status)
}

export async function saveWeeklyBlock(
  userId: string,
  athleteId: string,
  block: WeeklyTrainingBlock
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (canUseLocalFallback()) {
      const id = `local-week-${athleteId}-${block.weekStart}`
      const items = readLocalCollection<LocalWeeklyBlockRecord>(LOCAL_WEEKLY_BLOCKS_KEY)
      const record: LocalWeeklyBlockRecord = { id, athleteId, userId, block }
      const nextItems = items.filter((item) => item.id !== id)
      writeLocalCollection(LOCAL_WEEKLY_BLOCKS_KEY, [record, ...nextItems])
      return { success: true, id }
    }

    const { data, error } = await getClient()
      .from("running_weekly_blocks")
      .insert({
        user_id: userId,
        athlete_id: athleteId,
        week_start: block.weekStart,
        week_end: block.weekEnd,
        total_distance_km: block.totals.totalDistanceKm,
        total_duration_min: block.totals.totalDurationMin,
        sessions_count: block.totals.sessionsCount,
        rest_days: block.totals.restDays,
        easy_percent: block.structure.easySharePct,
        hard_percent: block.structure.qualitySharePct,
        long_run_completed: block.structure.longRunCompleted,
        intensity_distribution: block.structure.intensityBalance,
        most_effective_session: block.findings.strongestWeekSignal,
        biggest_issue: block.findings.biggestWeekCorrection,
        next_week_advice: block.nextWeekFocus,
      })
      .select("id")
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, id: data?.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save weekly block",
    }
  }
}

export async function getWeeklyBlocks(
  athleteId: string,
  limit = 10
): Promise<{ success: boolean; blocks?: WeeklyTrainingBlock[]; error?: string }> {
  try {
    if (canUseLocalFallback()) {
      const items = readLocalCollection<LocalWeeklyBlockRecord>(LOCAL_WEEKLY_BLOCKS_KEY)
        .filter((item) => item.athleteId === athleteId)
        .sort((left, right) => new Date(right.block.weekStart).getTime() - new Date(left.block.weekStart).getTime())
        .slice(0, limit)
      return { success: true, blocks: items.map((item) => item.block) }
    }

    const { data, error } = await getClient()
      .from("running_weekly_blocks")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("week_start", { ascending: false })
      .limit(limit)

    if (error) return { success: false, error: error.message }

    const blocks: WeeklyTrainingBlock[] = (data ?? []).map((row: any) => ({
      weekStart: row.week_start,
      weekEnd: row.week_end,
      sessions: [],
      totals: {
        totalDistanceKm: row.total_distance_km ?? 0,
        totalDurationMin: row.total_duration_min ?? 0,
        sessionsCount: row.sessions_count ?? 0,
        restDays: row.rest_days ?? 0,
      },
      structure: {
        easySharePct: row.easy_percent ?? 0,
        qualitySharePct: row.hard_percent ?? 0,
        longRunCompleted: row.long_run_completed ?? false,
        intensityBalance: row.intensity_distribution ?? "balanced",
      },
      scoreSummary: {
        averageFinalScore: 0,
        averageCompletion: 0,
        averagePacingControl: 0,
        averageLoadQuality: 0,
        averageGoalValue: 0,
      },
      findings: {
        blockVerdict: "",
        strongestWeekSignal: row.most_effective_session ?? "",
        biggestWeekCorrection: row.biggest_issue ?? "",
        detectedPatterns: [],
      },
      nextWeekFocus: row.next_week_advice ?? [],
      confidence: {
        score: 60,
        band: "medium",
        reasons: ["历史周块从存储层读取，未附带单次详情。"],
        missingData: ["sessions"],
      },
    }))

    return { success: true, blocks }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch weekly blocks",
    }
  }
}

export async function batchSaveRunningSessions(
  userId: string,
  athleteId: string,
  sessions: Array<{ input: RunningSessionInput; report: RunningScoreReport }>
): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
  const errors: string[] = []
  let savedCount = 0

  for (const session of sessions) {
    const result = await saveRunningSession(userId, athleteId, session.input, session.report)
    if (result.success) savedCount += 1
    else if (result.error) errors.push(result.error)
  }

  return { success: errors.length === 0, savedCount, errors }
}
