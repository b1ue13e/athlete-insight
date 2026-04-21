/**
 * Athlete profile helpers.
 *
 * Supabase is the preferred source of truth when a user is signed in.
 * localStorage remains a lightweight cache / offline fallback.
 */

import { getSupabaseClient } from "./supabase-client"

export type AthletePrimarySport = "volleyball" | "running" | "gym" | "fitness"

export interface AthleteProfile {
  id: string
  name: string
  position: string
  team?: string
  primarySport?: AthletePrimarySport
  createdAt: string
  updatedAt: string
  totalReports?: number
  averageScore?: number
}

export interface AthleteReportSummary {
  id: string
  athleteId: string
  athleteName: string
  createdAt: string
  overallScore: number
  verdict: string
}

const STORAGE_KEY = "athlete_profiles"
const REPORTS_STORAGE_KEY = "athlete_reports"
const CURRENT_ATHLETE_KEY = "current_athlete_id"
const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_project_url" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key"

type AthleteRow = {
  id: string
  user_id: string
  name: string
  primary_sport?: AthletePrimarySport
  position?: string | null
  team?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStorageJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeAthlete(row: AthleteRow): AthleteProfile {
  const fallbackTeam =
    typeof row.notes === "string" && row.notes.startsWith("Team: ")
      ? row.notes.replace(/^Team:\s*/, "")
      : undefined

  return {
    id: row.id,
    name: row.name,
    position: row.position ?? "未设置",
    team: row.team ?? fallbackTeam,
    primarySport: row.primary_sport,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mergeAthleteCache(athletes: AthleteProfile[]) {
  const next = athletes.slice().sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  writeStorageJson(STORAGE_KEY, next)
  return next
}

export function getAthletes(): AthleteProfile[] {
  return readStorageJson<AthleteProfile[]>(STORAGE_KEY, [])
}

export async function listAthletes(userId?: string): Promise<AthleteProfile[]> {
  if (!userId || !hasSupabaseConfig) {
    return getAthletes()
  }

  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from("athletes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error || !data) {
      return getAthletes()
    }

    return mergeAthleteCache((data as AthleteRow[]).map(normalizeAthlete))
  } catch {
    return getAthletes()
  }
}

export function getAthleteById(id: string): AthleteProfile | null {
  const athletes = getAthletes()
  return athletes.find((athlete) => athlete.id === id) || null
}

export async function fetchAthleteById(id: string, userId?: string): Promise<AthleteProfile | null> {
  const cached = getAthleteById(id)
  if (cached) {
    return cached
  }

  if (!userId || !hasSupabaseConfig) {
    return null
  }

  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from("athletes")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .single()

    if (error || !data) {
      return null
    }

    const athlete = normalizeAthlete(data as AthleteRow)
    mergeAthleteCache([...getAthletes(), athlete].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index))
    return athlete
  } catch {
    return null
  }
}

export async function createAthlete(
  data: Omit<AthleteProfile, "id" | "createdAt" | "updatedAt">,
  userId?: string
): Promise<AthleteProfile> {
  if (userId && hasSupabaseConfig) {
    const client = getSupabaseClient()
    let { data: row, error } = await client
      .from("athletes")
      .insert({
        user_id: userId,
        name: data.name,
        position: data.position,
        team: data.team ?? null,
        primary_sport: data.primarySport ?? "volleyball",
      })
      .select("*")
      .single()

    if (error) {
      const fallbackPrimarySport = data.primarySport === "gym" ? "fitness" : data.primarySport ?? "volleyball"
      ;({ data: row, error } = await client
        .from("athletes")
        .insert({
          user_id: userId,
          name: data.name,
          position: data.position,
          primary_sport: fallbackPrimarySport,
          notes: data.team ? `Team: ${data.team}` : null,
        })
        .select("*")
        .single())
    }

    if (!error && row) {
      const athlete = normalizeAthlete(row as AthleteRow)
      mergeAthleteCache([athlete, ...getAthletes().filter((item) => item.id !== athlete.id)])
      return athlete
    }
  }

  const athlete: AthleteProfile = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const athletes = getAthletes()
  athletes.push(athlete)
  writeStorageJson(STORAGE_KEY, athletes)

  return athlete
}

export async function getOrCreatePrimaryAthlete(params: {
  userId?: string
  userEmail?: string
  primarySport: AthletePrimarySport
  fallbackName?: string
  fallbackPosition?: string
  team?: string
}) {
  const current = await resolveCurrentAthlete(params.userId)
  if (current) {
    return { success: true as const, athlete: current }
  }

  const athletes = await listAthletes(params.userId)
  const matching = athletes.find((athlete) => athlete.primarySport === params.primarySport)
  if (matching) {
    setCurrentAthlete(matching.id)
    return { success: true as const, athlete: matching }
  }

  try {
    const athlete = await createAthlete(
      {
        name: params.fallbackName ?? params.userEmail?.split("@")[0] ?? "Athlete",
        position: params.fallbackPosition ?? "未设置",
        team: params.team,
        primarySport: params.primarySport,
      },
      params.userId
    )
    setCurrentAthlete(athlete.id)
    return { success: true as const, athlete }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create athlete profile",
    }
  }
}

export async function updateAthlete(
  id: string,
  data: Partial<AthleteProfile>,
  userId?: string
): Promise<AthleteProfile | null> {
  if (userId && hasSupabaseConfig) {
    const client = getSupabaseClient()
    let { data: row, error } = await client
      .from("athletes")
      .update({
        name: data.name,
        position: data.position,
        team: data.team,
        primary_sport: data.primarySport,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      ;({ data: row, error } = await client
        .from("athletes")
        .update({
          name: data.name,
          position: data.position,
          primary_sport: data.primarySport === "gym" ? "fitness" : data.primarySport,
          notes: data.team ? `Team: ${data.team}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("id", id)
        .select("*")
        .single())
    }

    if (!error && row) {
      const athlete = normalizeAthlete(row as AthleteRow)
      mergeAthleteCache([athlete, ...getAthletes().filter((item) => item.id !== id)])
      return athlete
    }
  }

  const athletes = getAthletes()
  const index = athletes.findIndex((athlete) => athlete.id === id)

  if (index === -1) return null

  athletes[index] = {
    ...athletes[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }

  writeStorageJson(STORAGE_KEY, athletes)
  return athletes[index]
}

export async function deleteAthlete(id: string, userId?: string): Promise<boolean> {
  if (userId && hasSupabaseConfig) {
    try {
      const client = getSupabaseClient()
      await client.from("athletes").delete().eq("user_id", userId).eq("id", id)
    } catch {
      // continue with local cache cleanup
    }
  }

  const athletes = getAthletes()
  const filteredAthletes = athletes.filter((athlete) => athlete.id !== id)

  if (filteredAthletes.length === athletes.length) return false

  writeStorageJson(STORAGE_KEY, filteredAthletes)
  return true
}

export function setCurrentAthlete(id: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CURRENT_ATHLETE_KEY, id)
}

export function getCurrentAthlete(): AthleteProfile | null {
  if (typeof window === "undefined") return null

  const id = localStorage.getItem(CURRENT_ATHLETE_KEY)
  if (!id) return null

  return getAthleteById(id)
}

export async function resolveCurrentAthlete(userId?: string): Promise<AthleteProfile | null> {
  if (typeof window === "undefined") return null
  const id = localStorage.getItem(CURRENT_ATHLETE_KEY)
  if (!id) return null
  return fetchAthleteById(id, userId)
}

export function clearCurrentAthlete(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CURRENT_ATHLETE_KEY)
}

export function getAllReports(): AthleteReportSummary[] {
  return readStorageJson<AthleteReportSummary[]>(REPORTS_STORAGE_KEY, [])
}

export function getAthleteReports(athleteId: string): AthleteReportSummary[] {
  return getAllReports().filter((report) => report.athleteId === athleteId)
}

export function deleteAthleteReports(athleteId: string): number {
  const reports = getAllReports()
  const filteredReports = reports.filter((report) => report.athleteId !== athleteId)
  const deletedCount = reports.length - filteredReports.length

  if (deletedCount > 0) {
    writeStorageJson(REPORTS_STORAGE_KEY, filteredReports)
  }

  return deletedCount
}

export function getAthleteStats(athleteId: string) {
  const reports = getAthleteReports(athleteId)

  if (reports.length === 0) {
    return {
      totalReports: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
    }
  }

  const scores = reports.map((report) => report.overallScore)
  return {
    totalReports: reports.length,
    averageScore: Math.round(scores.reduce((total, score) => total + score, 0) / scores.length),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
  }
}

function generateId(): string {
  return `athlete_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
