/**
 * 运动员档案管理
 * 
 * 本地存储运动员信息
 */

export interface AthleteProfile {
  id: string
  name: string
  position: string  // 中文：主攻、副攻、二传、接应、自由人
  team?: string
  createdAt: string
  updatedAt: string
  // 统计数据
  totalReports?: number
  averageScore?: number
}

const STORAGE_KEY = "athlete_profiles"
const CURRENT_ATHLETE_KEY = "current_athlete_id"

// 获取所有运动员
export function getAthletes(): AthleteProfile[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

// 根据ID获取运动员
export function getAthleteById(id: string): AthleteProfile | null {
  const athletes = getAthletes()
  return athletes.find(a => a.id === id) || null
}

// 创建运动员
export function createAthlete(data: Omit<AthleteProfile, "id" | "createdAt" | "updatedAt">): AthleteProfile {
  const athlete: AthleteProfile = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  const athletes = getAthletes()
  athletes.push(athlete)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(athletes))
  
  return athlete
}

// 更新运动员
export function updateAthlete(id: string, data: Partial<AthleteProfile>): AthleteProfile | null {
  const athletes = getAthletes()
  const index = athletes.findIndex(a => a.id === id)
  
  if (index === -1) return null
  
  athletes[index] = {
    ...athletes[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(athletes))
  return athletes[index]
}

// 删除运动员
export function deleteAthlete(id: string): boolean {
  const athletes = getAthletes()
  const filtered = athletes.filter(a => a.id !== id)
  
  if (filtered.length === athletes.length) return false
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}

// 设置当前运动员
export function setCurrentAthlete(id: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CURRENT_ATHLETE_KEY, id)
}

// 获取当前运动员
export function getCurrentAthlete(): AthleteProfile | null {
  if (typeof window === "undefined") return null
  const id = localStorage.getItem(CURRENT_ATHLETE_KEY)
  if (!id) return null
  return getAthleteById(id)
}

// 清除当前运动员
export function clearCurrentAthlete(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CURRENT_ATHLETE_KEY)
}

// 生成唯一ID
function generateId(): string {
  return `athlete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 获取运动员的报告列表
export function getAthleteReports(athleteId: string) {
  if (typeof window === "undefined") return []
  
  const reports = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
  return reports.filter((r: any) => r.athleteId === athleteId)
}

// 获取运动员统计数据
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
  
  const scores = reports.map((r: any) => r.overallScore)
  return {
    totalReports: reports.length,
    averageScore: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
  }
}
