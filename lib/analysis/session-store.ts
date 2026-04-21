import { getSupabaseClient } from "@/lib/supabase-client"
import { listAthletes, type AthleteProfile } from "@/lib/athletes"
import type { AnalysisSport } from "./contracts"
import type { ReportData } from "@/lib/report-engine"
import type { RunningScoreReport, RunningSessionInput } from "@/lib/scoring/running"
import type { GymAnalysisResult, GymSessionInput } from "@/lib/scoring/gym"

export type AnalysisSessionStatus = "draft" | "processing" | "completed" | "failed"
export type AnalysisInputMethod = "manual" | "csv" | "image" | "api" | "watch" | "imported"

export interface AnalysisSessionRecord<TInput = unknown, TReport = unknown> {
  id: string
  athlete_id: string
  user_id?: string
  sport_type: AnalysisSport
  title: string
  session_date: string
  status: AnalysisSessionStatus
  input_method: AnalysisInputMethod
  raw_input: TInput
  overall_score: number
  report_json: TReport
  summary_text: string
  model_version: string
  created_at: string
  updated_at: string
}

const STORAGE_KEY = "athlete_insight:analysis_sessions"
const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key"

function canUseLocalFallback() {
  return !hasSupabaseConfig && typeof window !== "undefined"
}

function readLocalSessions(): AnalysisSessionRecord[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as AnalysisSessionRecord[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalSessions(records: AnalysisSessionRecord[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function upsertLocalSession(record: AnalysisSessionRecord) {
  const current = readLocalSessions().filter((item) => item.id !== record.id)
  writeLocalSessions([record, ...current].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()))
}

function replaceLocalSession(previousId: string, record: AnalysisSessionRecord) {
  const current = readLocalSessions().filter((item) => item.id !== previousId && item.id !== record.id)
  writeLocalSessions([record, ...current].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()))
}

async function persistVolleyballEnhancements(sessionId: string, rawInput: any) {
  if (!hasSupabaseConfig) {
    return
  }

  const client = getSupabaseClient()
  await client.from("volleyball_inputs").upsert(
    {
      analysis_session_id: sessionId,
      match_name: rawInput.matchName ?? rawInput.match_name ?? "未命名比赛",
      opponent: rawInput.opponent ?? null,
      player_position: rawInput.position ?? rawInput.player_position ?? null,
      total_points: rawInput.totalPoints ?? rawInput.total_points ?? 0,
      total_points_lost: rawInput.totalPointsLost ?? rawInput.total_points_lost ?? 0,
      serve_aces: rawInput.serveAces ?? rawInput.serve_aces ?? 0,
      serve_errors: rawInput.serveErrors ?? rawInput.serve_errors ?? 0,
      attack_kills: rawInput.attackKills ?? rawInput.attack_kills ?? 0,
      attack_errors: rawInput.attackErrors ?? rawInput.attack_errors ?? 0,
      blocked_times: rawInput.blockedTimes ?? rawInput.blocked_times ?? 0,
      reception_success_rate: rawInput.receptionSuccessRate ?? rawInput.reception_success_rate ?? null,
      block_points: rawInput.blockPoints ?? rawInput.block_points ?? 0,
      digs: rawInput.digs ?? 0,
      clutch_performance_score: rawInput.clutchPerformanceScore ?? rawInput.clutch_performance_score ?? null,
      error_tags: rawInput.errorTags ?? rawInput.error_tags ?? [],
      notes: rawInput.notes ?? null,
    },
    { onConflict: "analysis_session_id" }
  )
}

async function persistRunningEnhancements(sessionId: string, input: RunningSessionInput, report: RunningScoreReport) {
  if (!hasSupabaseConfig) {
    return
  }

  const client = getSupabaseClient()
  await client.from("running_inputs").upsert(
    {
      analysis_session_id: sessionId,
      workout_name: `${input.trainingType} run`,
      distance_km: input.distanceKm,
      duration_seconds: Math.round(input.durationMin * 60),
      avg_pace_seconds: input.avgPaceSec ?? null,
      avg_heart_rate: input.avgHeartRate ?? null,
      max_heart_rate: input.maxHeartRate ?? null,
      training_goal: input.goalType ?? null,
      perceived_exertion: input.rpe ?? null,
      notes: input.notes ?? null,
      training_type: input.trainingType,
      goal_type: input.goalType ?? null,
      splits: input.splits ?? null,
      rpe: input.rpe ?? null,
      feeling: input.feeling ?? null,
      planned_distance_km: input.plannedDistance ?? null,
      planned_duration_min: input.plannedDuration ?? null,
      planned_pace_min: input.plannedPaceRange?.minSec ?? null,
      planned_pace_max: input.plannedPaceRange?.maxSec ?? null,
      planned_hr_min: input.plannedHeartRateRange?.min ?? null,
      planned_hr_max: input.plannedHeartRateRange?.max ?? null,
      source: input.source,
      has_gps: Boolean(input.telemetry?.length),
      has_heartrate: input.avgHeartRate !== undefined || input.heartRateSeries?.length,
      has_splits: Boolean(input.splits?.length),
      is_complete: true,
    },
    { onConflict: "analysis_session_id" }
  )

  await client.from("running_analysis_results").upsert(
    {
      analysis_session_id: sessionId,
      completion_score: report.scoreBreakdown.completion.score,
      rhythm_score: report.scoreBreakdown.pacingControl.score,
      load_score: report.scoreBreakdown.loadQuality.score,
      value_score: report.scoreBreakdown.goalValue.score,
      overall_score: report.scoreBreakdown.final.score,
      completion_status: report.scoreBreakdown.completion.range,
      rhythm_status: report.scoreBreakdown.pacingControl.range,
      load_status: report.scoreBreakdown.loadQuality.range,
      value_status: report.scoreBreakdown.goalValue.range,
      deviations: report.detectedDeviations,
      primary_deviation_type: report.detectedDeviations[0]?.code ?? null,
      confidence_score: report.confidence.score,
      confidence_level: report.confidence.band,
      confidence_reasons: report.confidence.reasons,
      summary_oneliner: report.scoreBreakdown.final.verdict,
      summary_praised: report.strongestSignal.detail,
      summary_fix: report.biggestCorrection.detail,
      summary_next_advice: report.nextSessionSuggestions[0] ?? null,
      engine_version: report.version,
    },
    { onConflict: "analysis_session_id" }
  )
}

async function persistGymEnhancements(sessionId: string, input: GymSessionInput) {
  if (!hasSupabaseConfig) {
    return
  }

  const client = getSupabaseClient()
  await client.from("gym_inputs").upsert(
    {
      analysis_session_id: sessionId,
      goal_type: input.goalType,
      split_type: input.splitType,
      session_tag: input.sessionTag,
      duration_minutes: input.durationMin,
      perceived_fatigue: input.perceivedFatigue ?? null,
      soreness: input.soreness ?? null,
      sleep_quality: input.sleepQuality ?? null,
      exercises: input.exercises,
      planned_session: input.plannedSession ?? null,
      source: input.source,
    },
    { onConflict: "analysis_session_id" }
  )
}

async function persistEnhancements<TInput, TReport>(params: {
  sessionId: string
  sportType: AnalysisSport
  rawInput: TInput
  report: TReport
}) {
  switch (params.sportType) {
    case "running":
      return persistRunningEnhancements(params.sessionId, params.rawInput as RunningSessionInput, params.report as RunningScoreReport)
    case "gym":
      return persistGymEnhancements(params.sessionId, params.rawInput as GymSessionInput)
    case "volleyball":
      return persistVolleyballEnhancements(params.sessionId, params.rawInput as any)
  }
}

export async function saveAnalysisSession<TInput, TReport>(params: {
  id?: string
  userId?: string
  athleteId: string
  sportType: AnalysisSport
  title: string
  sessionDate: string
  inputMethod: AnalysisInputMethod
  rawInput: TInput
  overallScore: number
  report: TReport
  summaryText: string
  modelVersion: string
  status?: AnalysisSessionStatus
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const now = new Date().toISOString()
  const localId = params.id ?? `local-session-${Date.now()}`
  const record: AnalysisSessionRecord<TInput, TReport> = {
    id: localId,
    athlete_id: params.athleteId,
    user_id: params.userId,
    sport_type: params.sportType,
    title: params.title,
    session_date: params.sessionDate,
    status: params.status ?? "completed",
    input_method: params.inputMethod,
    raw_input: params.rawInput,
    overall_score: params.overallScore,
    report_json: params.report,
    summary_text: params.summaryText,
    model_version: params.modelVersion,
    created_at: now,
    updated_at: now,
  }

  upsertLocalSession(record)

  if (canUseLocalFallback() || !params.userId) {
    return { success: true, id: localId }
  }

  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from("analysis_sessions")
      .insert({
        athlete_id: params.athleteId,
        sport_type: params.sportType,
        title: params.title,
        session_date: params.sessionDate,
        status: params.status ?? "completed",
        input_method: params.inputMethod,
        raw_input: params.rawInput,
        overall_score: params.overallScore,
        report_json: params.report,
        summary_text: params.summaryText,
        model_version: params.modelVersion,
      })
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const remoteId = data?.id ?? localId
    replaceLocalSession(localId, {
      ...record,
      id: remoteId,
    })
    await persistEnhancements({
      sessionId: remoteId,
      sportType: params.sportType,
      rawInput: params.rawInput,
      report: params.report,
    })
    return { success: true, id: remoteId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save analysis session",
    }
  }
}

export async function getAnalysisSessions(params: {
  userId?: string
  athleteId?: string
  sportType?: AnalysisSport
  limit?: number
}): Promise<{ success: boolean; sessions?: AnalysisSessionRecord[]; error?: string }> {
  const limit = params.limit ?? 20

  if (canUseLocalFallback() || !params.userId) {
    const sessions = readLocalSessions()
      .filter((record) => (params.athleteId ? record.athlete_id === params.athleteId : true))
      .filter((record) => (params.sportType ? record.sport_type === params.sportType : true))
      .slice(0, limit)

    return { success: true, sessions }
  }

  try {
    let athleteIds: string[] = []
    if (params.athleteId) {
      athleteIds = [params.athleteId]
    } else {
      athleteIds = (await listAthletes(params.userId)).map((athlete) => athlete.id)
    }

    if (athleteIds.length === 0) {
      return { success: true, sessions: [] }
    }

    let query = getSupabaseClient()
      .from("analysis_sessions")
      .select("*")
      .in("athlete_id", athleteIds)

    if (params.sportType) {
      query = query.eq("sport_type", params.sportType)
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit)
    if (error) {
      return { success: false, error: error.message }
    }

    const sessions = (data ?? []) as AnalysisSessionRecord[]
    sessions.forEach((record) => upsertLocalSession(record))
    return { success: true, sessions }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch analysis sessions",
    }
  }
}

export async function getAnalysisSessionById(id: string): Promise<{ success: boolean; session?: AnalysisSessionRecord; error?: string }> {
  const cached = readLocalSessions().find((record) => record.id === id)
  if (cached) {
    return { success: true, session: cached }
  }

  if (!hasSupabaseConfig) {
    return { success: false, error: "Analysis session not found" }
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from("analysis_sessions")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return { success: false, error: error?.message ?? "Analysis session not found" }
    }

    const session = data as AnalysisSessionRecord
    upsertLocalSession(session)
    return { success: true, session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch analysis session",
    }
  }
}

export async function updateAnalysisSessionStatus(id: string, status: AnalysisSessionStatus): Promise<{ success: boolean; error?: string }> {
  const current = readLocalSessions()
  const next = current.map((record) =>
    record.id === id
      ? {
          ...record,
          status,
          updated_at: new Date().toISOString(),
        }
      : record
  )
  writeLocalSessions(next)

  if (!hasSupabaseConfig) {
    return { success: true }
  }

  try {
    const { error } = await getSupabaseClient()
      .from("analysis_sessions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update analysis session",
    }
  }
}

export function buildRunningSessionSummary(report: RunningScoreReport) {
  const parts = [report.scoreBreakdown.final.verdict]
  if (report.detectedDeviations[0]) {
    parts.push(report.detectedDeviations[0].label)
  }
  parts.push(`confidence=${report.confidence.band}`)
  return parts.join(" | ")
}

export function buildGymSessionSummary(report: GymAnalysisResult) {
  return [report.strongestSignal, report.biggestCorrection].filter(Boolean).join(" | ")
}

export function buildLegacyVolleyballSummary(report: ReportData) {
  return [report.overview.verdict, report.overview.summary].filter(Boolean).join(" | ")
}

export async function saveLegacyVolleyballSession(params: {
  userId?: string
  athlete: AthleteProfile
  rawInput: unknown
  report: ReportData
  inputMethod?: AnalysisInputMethod
}) {
  return saveAnalysisSession({
    id: params.report.id,
    userId: params.userId,
    athleteId: params.athlete.id,
    sportType: "volleyball",
    title: params.report.matchName,
    sessionDate: params.report.matchDate,
    inputMethod: params.inputMethod ?? "manual",
    rawInput: params.rawInput,
    overallScore: params.report.overview.overallScore,
    report: params.report,
    summaryText: buildLegacyVolleyballSummary(params.report),
    modelVersion: "legacy-report-engine",
  })
}

export async function saveRunningAnalysisSession(params: {
  id?: string
  userId?: string
  athlete: AthleteProfile
  input: RunningSessionInput
  report: RunningScoreReport
}) {
  return saveAnalysisSession({
    id: params.id,
    userId: params.userId,
    athleteId: params.athlete.id,
    sportType: "running",
    title: `${params.input.trainingType} run`,
    sessionDate: new Date(params.input.date).toISOString().slice(0, 10),
    inputMethod: params.input.source,
    rawInput: params.input,
    overallScore: params.report.scoreBreakdown.final.score,
    report: params.report,
    summaryText: buildRunningSessionSummary(params.report),
    modelVersion: params.report.version,
  })
}

export async function saveGymAnalysisSession(params: {
  id?: string
  userId?: string
  athlete: AthleteProfile
  input: GymSessionInput
  report: GymAnalysisResult
}) {
  return saveAnalysisSession({
    id: params.id,
    userId: params.userId,
    athleteId: params.athlete.id,
    sportType: "gym",
    title: `${params.input.goalType} · ${params.input.sessionTag}`,
    sessionDate: params.input.sessionDate,
    inputMethod: "manual",
    rawInput: params.input,
    overallScore: params.report.finalGymScore,
    report: params.report,
    summaryText: buildGymSessionSummary(params.report),
    modelVersion: "gym-score-v1",
  })
}
