import type { ReportData } from "@/lib/report-engine"
import { getSupabaseClient } from "@/lib/supabase-client"
import type { CanonicalAnalysisReport, AnalysisSport } from "./contracts"

export type DiagnosisFeedback = "helpful" | "missed"

export interface DiagnosisRecordSummary {
  id: string
  analysisSessionId?: string
  sport: AnalysisSport
  athleteId?: string
  athleteName: string
  title: string
  createdAt: string
  sessionDate: string
  overallScore: number
  verdict: string
  rangeLabel: string
  confidenceLabel: string
  feedback?: DiagnosisFeedback
}

export interface DiagnosisRecord extends DiagnosisRecordSummary {
  analysisSessionId?: string
  canonicalReport: CanonicalAnalysisReport
  rawReport?: unknown
  source: "legacy" | "pipeline"
}

const STORAGE_KEY = "athlete_insight:diagnosis_records"
const DIAGNOSIS_TABLE = "diagnosis_records"
const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key"

interface RemoteDiagnosisRecordRow {
  local_record_id: string
  analysis_session_id?: string | null
  sport_type: AnalysisSport
  athlete_local_id?: string | null
  athlete_name: string
  title: string
  created_at: string
  session_date: string
  overall_score: number
  verdict: string
  range_label: string
  confidence_label: string
  canonical_report: CanonicalAnalysisReport
  raw_report?: unknown
  feedback?: DiagnosisFeedback | null
  source: DiagnosisRecord["source"]
}

function readRecords(): DiagnosisRecord[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as DiagnosisRecord[]) : []
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((record) => {
      if (record.feedback) {
        return record
      }

      const legacyFeedback = window.localStorage.getItem(`athlete_insight:feedback:${record.id}`)
      if (legacyFeedback === "helpful" || legacyFeedback === "missed") {
        return {
          ...record,
          feedback: legacyFeedback,
        }
      }

      return record
    })
  } catch {
    return []
  }
}

function writeRecords(records: DiagnosisRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function mergeRecords(records: DiagnosisRecord[]) {
  const merged = records.reduce<Map<string, DiagnosisRecord>>((map, record) => {
    const existing = map.get(record.id)
    map.set(record.id, {
      ...existing,
      ...record,
      feedback: record.feedback ?? existing?.feedback,
    })
    return map
  }, new Map())

  const next = Array.from(merged.values()).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  writeRecords(next)
  return next
}

function toSummary(record: DiagnosisRecord): DiagnosisRecordSummary {
  const { canonicalReport } = record
  return {
    id: record.id,
    analysisSessionId: record.analysisSessionId,
    sport: record.sport,
    athleteId: record.athleteId,
    athleteName: record.athleteName,
    title: record.title,
    createdAt: record.createdAt,
    sessionDate: record.sessionDate,
    overallScore: canonicalReport.scoreOverview.finalScore,
    verdict: canonicalReport.scoreOverview.verdict,
    rangeLabel: canonicalReport.scoreOverview.rangeLabel,
    confidenceLabel: canonicalReport.confidence.label,
    feedback: record.feedback,
  }
}

export function getAllDiagnosisRecords() {
  return readRecords().sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export function getDiagnosisRecord(id: string) {
  return getAllDiagnosisRecords().find((record) => record.id === id) ?? null
}

export function getDiagnosisSummaries(): DiagnosisRecordSummary[] {
  return getAllDiagnosisRecords().map(toSummary)
}

export function saveDiagnosisRecord(record: DiagnosisRecord) {
  const records = readRecords()
  const existing = records.find((item) => item.id === record.id)
  const filtered = records.filter((item) => item.id !== record.id)
  filtered.push({
    ...record,
    feedback: record.feedback ?? existing?.feedback,
    ...toSummary(record),
  })
  writeRecords(filtered)
}

export function getDiagnosisRecordsForAthlete(athleteId: string, athleteName?: string) {
  return getAllDiagnosisRecords().filter((record) => {
    if (record.athleteId && record.athleteId === athleteId) {
      return true
    }

    return Boolean(athleteName && record.athleteName === athleteName)
  })
}

export function getDiagnosisStatsForAthlete(athleteId: string, athleteName?: string) {
  const records = getDiagnosisRecordsForAthlete(athleteId, athleteName)

  if (records.length === 0) {
    return {
      totalReports: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      helpfulCount: 0,
      missedCount: 0,
    }
  }

  const scores = records.map((record) => record.overallScore)
  return {
    totalReports: records.length,
    averageScore: Math.round(scores.reduce((total, score) => total + score, 0) / scores.length),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    helpfulCount: records.filter((record) => record.feedback === "helpful").length,
    missedCount: records.filter((record) => record.feedback === "missed").length,
  }
}

export async function deleteDiagnosisRecordsForAthlete(athleteId: string, athleteName?: string, userId?: string) {
  const records = getAllDiagnosisRecords()
  const next = records.filter((record) => {
    if (record.athleteId && record.athleteId === athleteId) {
      return false
    }

    if (athleteName && record.athleteName === athleteName) {
      return false
    }

    return true
  })

  writeRecords(next)
  const deletedCount = records.length - next.length

  if (userId && hasSupabaseConfig) {
    try {
      const client = getSupabaseClient()
      let query = client.from(DIAGNOSIS_TABLE).delete().eq("user_id", userId).eq("athlete_local_id", athleteId)
      if (!athleteId && athleteName) {
        query = client.from(DIAGNOSIS_TABLE).delete().eq("user_id", userId).eq("athlete_name", athleteName)
      }
      await query
    } catch {
      // keep local deletion even if remote cleanup fails
    }
  }

  return deletedCount
}

export function deleteDiagnosisRecord(id: string) {
  const records = readRecords()
  const next = records.filter((record) => record.id !== id)
  writeRecords(next)
}

export function setDiagnosisFeedback(id: string, feedback: DiagnosisFeedback) {
  const records = readRecords().map((record) => (record.id === id ? { ...record, feedback } : record))
  writeRecords(records)
}

export function clearDiagnosisFeedback(id: string) {
  const records = readRecords().map((record) => (record.id === id ? { ...record, feedback: undefined } : record))
  writeRecords(records)
}

function toRemoteRow(record: DiagnosisRecord): RemoteDiagnosisRecordRow {
  return {
    local_record_id: record.id,
    analysis_session_id: record.analysisSessionId ?? null,
    sport_type: record.sport,
    athlete_local_id: record.athleteId ?? null,
    athlete_name: record.athleteName,
    title: record.title,
    created_at: record.createdAt,
    session_date: record.sessionDate,
    overall_score: record.overallScore,
    verdict: record.verdict,
    range_label: record.rangeLabel,
    confidence_label: record.confidenceLabel,
    canonical_report: record.canonicalReport,
    raw_report: record.rawReport,
    feedback: record.feedback ?? null,
    source: record.source,
  }
}

function fromRemoteRow(row: RemoteDiagnosisRecordRow): DiagnosisRecord {
  return {
    id: row.local_record_id,
    analysisSessionId: row.analysis_session_id ?? undefined,
    sport: row.sport_type,
    athleteId: row.athlete_local_id ?? undefined,
    athleteName: row.athlete_name,
    title: row.title,
    createdAt: row.created_at,
    sessionDate: row.session_date,
    overallScore: row.overall_score,
    verdict: row.verdict,
    rangeLabel: row.range_label,
    confidenceLabel: row.confidence_label,
    feedback: row.feedback ?? undefined,
    canonicalReport: row.canonical_report,
    rawReport: row.raw_report,
    source: row.source,
  }
}

async function saveDiagnosisRecordToSupabase(userId: string, record: DiagnosisRecord) {
  if (!hasSupabaseConfig || !record.analysisSessionId) {
    return
  }

  const client = getSupabaseClient()
  await client.from(DIAGNOSIS_TABLE).upsert(
    {
      user_id: userId,
      ...toRemoteRow(record),
    },
    {
      onConflict: "user_id,local_record_id",
    }
  )
}

export async function syncDiagnosisRecordsFromSupabase(userId: string) {
  if (!hasSupabaseConfig) {
    return getAllDiagnosisRecords()
  }

  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from(DIAGNOSIS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300)

    if (error || !data) {
      return getAllDiagnosisRecords()
    }

    return mergeRecords(data.map((row) => fromRemoteRow(row as RemoteDiagnosisRecordRow)))
  } catch {
    return getAllDiagnosisRecords()
  }
}

export async function fetchDiagnosisRecordFromSupabase(userId: string, id: string) {
  if (!hasSupabaseConfig) {
    return null
  }

  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from(DIAGNOSIS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("local_record_id", id)
      .single()

    if (error || !data) {
      return null
    }

    const record = fromRemoteRow(data as RemoteDiagnosisRecordRow)
    mergeRecords([record])
    return record
  } catch {
    return null
  }
}

export async function removeDiagnosisRecordEverywhere(id: string, userId?: string) {
  deleteDiagnosisRecord(id)

  if (!userId || !hasSupabaseConfig) {
    return
  }

  try {
    const client = getSupabaseClient()
    await client.from(DIAGNOSIS_TABLE).delete().eq("user_id", userId).eq("local_record_id", id)
  } catch {
    // keep local delete even if remote delete fails
  }
}

export async function persistDiagnosisFeedback(id: string, feedback: DiagnosisFeedback, userId?: string) {
  setDiagnosisFeedback(id, feedback)

  if (!userId || !hasSupabaseConfig) {
    return
  }

  try {
    const client = getSupabaseClient()
    await client
      .from(DIAGNOSIS_TABLE)
      .update({ feedback })
      .eq("user_id", userId)
      .eq("local_record_id", id)
  } catch {
    // keep local feedback even if remote update fails
  }
}

export function legacyReportToCanonical(report: ReportData): CanonicalAnalysisReport {
  const priorities = [
    ...report.recommendations.highPriority.map((detail) => ({ title: "高优先级", detail })),
    ...report.recommendations.mediumPriority.map((detail) => ({ title: "中优先级", detail })),
    ...report.recommendations.lowPriority.map((detail) => ({ title: "低优先级", detail })),
  ]

  return {
    meta: {
      sport: "volleyball",
      sessionId: report.id,
      generatedAt: report.createdAt,
      version: "legacy-report-engine",
      title: report.matchName,
      sessionDate: report.matchDate,
    },
    inputSummary: {
      headline: `${report.matchName}${report.opponent ? ` · 对手 ${report.opponent}` : ""}`,
      source: "manual",
      context: [report.position],
    },
    scoreOverview: {
      finalScore: report.overview.overallScore,
      rangeLabel: report.overview.verdict,
      verdict: report.overview.summary,
      dimensions: [
        {
          key: "scoring",
          label: "得分贡献",
          score: report.subScores.scoring,
          verdict: `得分贡献 ${report.subScores.scoring}`,
          evidence: [],
        },
        {
          key: "errorControl",
          label: "失误控制",
          score: report.subScores.errorControl,
          verdict: `失误控制 ${report.subScores.errorControl}`,
          evidence: [],
        },
        {
          key: "stability",
          label: "稳定性",
          score: report.subScores.stability,
          verdict: `稳定性 ${report.subScores.stability}`,
          evidence: [],
        },
        {
          key: "clutch",
          label: "关键分",
          score: report.subScores.clutch,
          verdict: `关键分 ${report.subScores.clutch}`,
          evidence: [],
        },
      ],
    },
    keyFindings: [
      ...report.strengths.slice(0, 2).map((item, index) => ({
        id: `strength-${index}`,
        title: "表现亮点",
        summary: item,
        evidence: [],
        tone: "positive" as const,
      })),
      ...report.weaknesses.slice(0, 2).map((item, index) => ({
        id: `weakness-${index}`,
        title: "主要问题",
        summary: item,
        evidence: [],
        tone: "warning" as const,
      })),
    ],
    evidence: report.errorTags.map((item, index) => ({
      id: `tag-${index}`,
      label: "错误标签",
      detail: item,
    })),
    riskFlags: report.weaknesses.map((item, index) => ({
      id: `risk-${index}`,
      label: "待修正问题",
      detail: item,
      severity: "medium" as const,
      evidence: [],
    })),
    nextActions: priorities.slice(0, 4).map((item, index) => ({
      id: `action-${index}`,
      title: item.title,
      detail: item.detail,
    })),
    confidence: {
      band: "medium",
      label: "中",
      summary: "这是一份基于旧版本地报告引擎生成的诊断，适合继续留作长期复盘材料。",
      caveats: [],
    },
    trendHooks: [
      {
        id: "overall-score",
        label: "综合得分",
        value: String(report.overview.overallScore),
        note: report.overview.verdict,
      },
      {
        id: "scoring",
        label: "得分贡献",
        value: String(report.subScores.scoring),
        note: "用于长期比较主攻输出变化",
      },
      {
        id: "stability",
        label: "稳定性",
        value: String(report.subScores.stability),
        note: "用于观察失误与接发波动",
      },
    ],
  }
}

export async function saveLegacyDiagnosisReport(report: ReportData, userId?: string, analysisSessionId?: string) {
  const canonicalReport = legacyReportToCanonical(report)
  const record: DiagnosisRecord = {
    id: report.id,
    analysisSessionId,
    sport: "volleyball",
    athleteId: report.athleteId,
    athleteName: report.athleteName,
    title: report.matchName,
    createdAt: report.createdAt,
    sessionDate: report.matchDate,
    overallScore: canonicalReport.scoreOverview.finalScore,
    verdict: canonicalReport.scoreOverview.verdict,
    rangeLabel: canonicalReport.scoreOverview.rangeLabel,
    confidenceLabel: canonicalReport.confidence.label,
    canonicalReport,
    rawReport: report,
    source: "legacy",
  }

  saveDiagnosisRecord(record)

  if (userId) {
    await saveDiagnosisRecordToSupabase(userId, record)
  }
}

export async function saveCanonicalDiagnosisRecord(params: {
  id: string
  analysisSessionId?: string
  sport: AnalysisSport
  athleteId?: string
  athleteName: string
  title: string
  createdAt: string
  sessionDate: string
  canonicalReport: CanonicalAnalysisReport
  rawReport?: unknown
  userId?: string
}) {
  const record: DiagnosisRecord = {
    id: params.id,
    analysisSessionId: params.analysisSessionId,
    sport: params.sport,
    athleteId: params.athleteId,
    athleteName: params.athleteName,
    title: params.title,
    createdAt: params.createdAt,
    sessionDate: params.sessionDate,
    overallScore: params.canonicalReport.scoreOverview.finalScore,
    verdict: params.canonicalReport.scoreOverview.verdict,
    rangeLabel: params.canonicalReport.scoreOverview.rangeLabel,
    confidenceLabel: params.canonicalReport.confidence.label,
    canonicalReport: params.canonicalReport,
    rawReport: params.rawReport,
    source: "pipeline",
  }

  saveDiagnosisRecord(record)

  if (params.userId) {
    await saveDiagnosisRecordToSupabase(params.userId, record)
  }
}
