/**
 * Athlete profile storage helpers.
 *
 * Data is persisted in localStorage for the current device.
 */

export interface AthleteProfile {
  id: string
  name: string
  position: string
  team?: string
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

export function getAthletes(): AthleteProfile[] {
  return readStorageJson<AthleteProfile[]>(STORAGE_KEY, [])
}

export function getAthleteById(id: string): AthleteProfile | null {
  const athletes = getAthletes()
  return athletes.find((athlete) => athlete.id === id) || null
}

export function createAthlete(data: Omit<AthleteProfile, "id" | "createdAt" | "updatedAt">): AthleteProfile {
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

export function updateAthlete(id: string, data: Partial<AthleteProfile>): AthleteProfile | null {
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

export function deleteAthlete(id: string): boolean {
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
