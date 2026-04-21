import { getSupabaseClient } from "@/lib/supabase-client"
import type { AnalysisSport } from "./contracts"
import { getAnalysisSessionById, type AnalysisSessionRecord } from "./session-store"

const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key"

export interface AnalysisDebugLayer {
  key: string
  label: string
  available: boolean
  source: "derived" | "remote" | "none"
  summary: string
  payload?: unknown
}

export interface AnalysisDebugBundle {
  session: AnalysisSessionRecord | null
  layers: AnalysisDebugLayer[]
}

function summarizeKeys(value: Record<string, unknown> | undefined, keys: string[]) {
  if (!value) return "No payload"

  return keys
    .map((key) => {
      const item = value[key]
      if (item === undefined || item === null || item === "") return null
      return `${key}=${Array.isArray(item) ? item.length : item}`
    })
    .filter(Boolean)
    .join(" · ")
}

function deriveLayers(session: AnalysisSessionRecord): AnalysisDebugLayer[] {
  const input = session.raw_input as Record<string, unknown>
  const report = session.report_json as Record<string, unknown>

  switch (session.sport_type) {
    case "running":
      return [
        {
          key: "running_inputs",
          label: "running_inputs",
          available: true,
          source: "derived",
          summary: summarizeKeys(input, ["trainingType", "distanceKm", "durationMin", "avgHeartRate"]),
          payload: input,
        },
        {
          key: "running_analysis_results",
          label: "running_analysis_results",
          available: Boolean(report?.scoreBreakdown),
          source: "derived",
          summary: summarizeKeys((report?.scoreBreakdown as Record<string, unknown>) ?? undefined, ["final", "completion", "pacingControl"]),
          payload: report,
        },
      ]
    case "gym":
      return [
        {
          key: "gym_inputs",
          label: "gym_inputs",
          available: true,
          source: "derived",
          summary: summarizeKeys(input, ["goalType", "splitType", "sessionTag", "durationMin"]),
          payload: input,
        },
      ]
    case "volleyball":
      return [
        {
          key: "volleyball_inputs",
          label: "volleyball_inputs",
          available: true,
          source: "derived",
          summary: summarizeKeys(input, ["matchName", "opponent", "totalPoints", "totalPointsLost"]),
          payload: input,
        },
      ]
  }
}

async function loadRemoteLayers(sessionId: string, sport: AnalysisSport): Promise<Record<string, unknown>> {
  if (!hasSupabaseConfig) {
    return {}
  }

  const client = getSupabaseClient()

  switch (sport) {
    case "running": {
      const [{ data: runningInput }, { data: runningResult }] = await Promise.all([
        client.from("running_inputs").select("*").eq("analysis_session_id", sessionId).single(),
        client.from("running_analysis_results").select("*").eq("analysis_session_id", sessionId).single(),
      ])
      return {
        running_inputs: runningInput ?? undefined,
        running_analysis_results: runningResult ?? undefined,
      }
    }
    case "gym": {
      const { data } = await client.from("gym_inputs").select("*").eq("analysis_session_id", sessionId).single()
      return { gym_inputs: data ?? undefined }
    }
    case "volleyball": {
      const { data } = await client.from("volleyball_inputs").select("*").eq("analysis_session_id", sessionId).single()
      return { volleyball_inputs: data ?? undefined }
    }
  }
}

export async function getAnalysisDebugBundle(params: {
  analysisSessionId?: string
  fallbackSessionId?: string
  sport: AnalysisSport
}): Promise<AnalysisDebugBundle> {
  const sessionId = params.analysisSessionId ?? params.fallbackSessionId
  if (!sessionId) {
    return { session: null, layers: [] }
  }

  const sessionResult = await getAnalysisSessionById(sessionId)
  const session = sessionResult.session ?? null
  if (!session) {
    return { session: null, layers: [] }
  }

  const derivedLayers = deriveLayers(session)
  const remoteLayers = await loadRemoteLayers(session.id, params.sport)

  const layers = derivedLayers.map((layer) => {
    const remote = remoteLayers[layer.key]
    if (remote) {
      return {
        ...layer,
        available: true,
        source: "remote" as const,
        summary: summarizeKeys(remote as Record<string, unknown>, Object.keys(remote as Record<string, unknown>).slice(0, 6)),
        payload: remote,
      }
    }

    return layer
  })

  return { session, layers }
}
