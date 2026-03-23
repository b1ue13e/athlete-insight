/**
 * 个体基线系统
 * 
 * 建立运动员的个人表现基线，提供画像级判断
 */

import { ReportData } from "./report-engine"

export interface AthleteBaseline {
  athleteId: string
  athleteName: string
  
  // 赛季统计
  seasonStats: {
    totalGames: number
    averageScore: number
    medianScore: number
    bestScore: number
    worstScore: number
    stdDeviation: number  // 波动程度
  }
  
  // 各维度基线
  dimensionBaselines: {
    dimension: string
    label: string
    seasonAvg: number
    median: number
    recent5Avg: number
    consistency: "high" | "medium" | "low"
    trend: "improving" | "declining" | "stable"
  }[]
  
  // 个人特征画像
  profile: {
    strengthDimension: string  // 最强维度
    weaknessDimension: string  // 最弱维度
    mostImproved: string       // 进步最大维度
    mostVolatile: string       // 最不稳定维度
  }
  
  // 历史表现分位
  percentiles: {
    currentGame: number  // 本场在历史的百分位
    scoring: number
    errorControl: number
    stability: number
    clutch: number
  }
}

// 生成运动员基线
export function generateAthleteBaseline(
  athleteId: string,
  athleteName: string,
  currentReport: ReportData
): AthleteBaseline {
  const history = getAthleteReportHistory(athleteId)
  const allReports = [currentReport, ...history].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  const totalGames = allReports.length
  const scores = allReports.map(r => r.overview.overallScore)
  
  // 基础统计
  const seasonStats = {
    totalGames,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    medianScore: calculateMedian(scores),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    stdDeviation: calculateStdDeviation(scores),
  }
  
  // 各维度基线
  const dimensions = [
    { key: "scoring", label: "得分贡献" },
    { key: "errorControl", label: "失误控制" },
    { key: "stability", label: "稳定性" },
    { key: "clutch", label: "关键分表现" },
  ]
  
  const dimensionBaselines = dimensions.map(({ key, label }) => {
    const dimScores = allReports.map(r => 
      r.subScores[key as keyof typeof r.subScores] as number
    ).filter(Boolean)
    
    const seasonAvg = Math.round(dimScores.reduce((a, b) => a + b, 0) / dimScores.length)
    const median = calculateMedian(dimScores)
    const recent5 = dimScores.slice(0, 5)
    const recent5Avg = recent5.length > 0 
      ? Math.round(recent5.reduce((a, b) => a + b, 0) / recent5.length)
      : seasonAvg
    
    // 计算稳定性（标准差）
    const stdDev = calculateStdDeviation(dimScores)
    let consistency: "high" | "medium" | "low" = "medium"
    if (stdDev < 8) consistency = "high"
    else if (stdDev > 15) consistency = "low"
    
    // 计算趋势
    const trend = calculateTrend(dimScores.slice(0, 5))
    
    return {
      dimension: key,
      label,
      seasonAvg,
      median,
      recent5Avg,
      consistency,
      trend,
    }
  })
  
  // 个人特征画像
  const profile = generateProfile(dimensionBaselines)
  
  // 计算当前场次的百分位
  const percentiles = calculatePercentiles(currentReport, history)
  
  return {
    athleteId,
    athleteName,
    seasonStats,
    dimensionBaselines,
    profile,
    percentiles,
  }
}

// 生成画像级判断语句
export function generateBaselineInsights(
  baseline: AthleteBaseline,
  currentReport: ReportData
): string[] {
  const insights: string[] = []
  const { seasonStats, dimensionBaselines, profile, percentiles } = baseline
  
  // 1. 本场定位
  if (percentiles.currentGame >= 80) {
    insights.push(`这是你近${seasonStats.totalGames}场里表现前20%的一场`)
  } else if (percentiles.currentGame >= 60) {
    insights.push(`这场表现高于你本赛季中位水平`)
  } else if (percentiles.currentGame <= 20) {
    insights.push(`这场表现低于你平时水平，建议复盘`)
  }
  
  // 2. 维度亮点/问题
  dimensionBaselines.forEach(dim => {
    const currentScore = currentReport.subScores[dim.dimension as keyof typeof currentReport.subScores] as number
    
    if (currentScore >= dim.seasonAvg + 10) {
      insights.push(`${dim.label}明显高于你赛季均值，是本场亮点`)
    } else if (currentScore <= dim.seasonAvg - 10) {
      if (dim.dimension === profile.strengthDimension) {
        insights.push(`${dim.label}（你的优势项）本场失常，需关注`)
      } else {
        insights.push(`${dim.label}低于你平时水平`)
      }
    }
  })
  
  // 3. 连续趋势
  const consecutiveTrend = findConsecutiveTrend(
    currentReport.overview.overallScore,
    getAthleteReportHistory(baseline.athleteId).map(r => r.overview.overallScore)
  )
  
  if (consecutiveTrend.streak >= 3) {
    if (consecutiveTrend.direction === "up") {
      insights.push(`已连续${consecutiveTrend.streak}场进步，状态上升期`)
    } else if (consecutiveTrend.direction === "down") {
      insights.push(`已连续${consecutiveTrend.streak}场下滑，建议调整`)
    }
  }
  
  // 4. 稳定性特征
  const volatileDim = dimensionBaselines.find(d => d.consistency === "low")
  if (volatileDim) {
    insights.push(`${volatileDim.label}是你的波动项，需要重点稳定`)
  }
  
  // 5. 综合画像
  if (percentiles.currentGame >= 70) {
    const weakDims = dimensionBaselines.filter(d => {
      const score = currentReport.subScores[d.dimension as keyof typeof currentReport.subScores] as number
      return score < d.seasonAvg
    })
    
    if (weakDims.length === 0) {
      insights.push(`本场全面发挥，无明显短板`)
    } else if (weakDims.length === 1) {
      insights.push(`上限在，但${weakDims[0].label}拖了后腿`)
    }
  }
  
  return insights
}

// 生成用于报告展示的比较语句
export function generateComparisonStatements(
  baseline: AthleteBaseline,
  currentReport: ReportData
): { type: "positive" | "negative" | "neutral"; text: string }[] {
  const statements: { type: "positive" | "negative" | "neutral"; text: string }[] = []
  
  // 各维度排名
  const dimensions = [
    { key: "scoring", label: "进攻贡献" },
    { key: "errorControl", label: "失误控制" },
    { key: "stability", label: "稳定性" },
    { key: "clutch", label: "关键分" },
  ]
  
  dimensions.forEach(({ key, label }) => {
    const current = currentReport.subScores[key as keyof typeof currentReport.subScores] as number
    const baseline_dim = baseline.dimensionBaselines.find(d => d.dimension === key)
    
    if (!baseline_dim) return
    
    const diff = current - baseline_dim.seasonAvg
    
    if (diff >= 8) {
      statements.push({ type: "positive", text: `${label}高于赛季均值${diff}分` })
    } else if (diff >= 3) {
      statements.push({ type: "positive", text: `${label}小幅高于平时水平` })
    } else if (diff <= -8) {
      statements.push({ type: "negative", text: `${label}低于赛季均值${Math.abs(diff)}分` })
    } else if (diff <= -3) {
      statements.push({ type: "negative", text: `${label}略低于平时水平` })
    } else {
      statements.push({ type: "neutral", text: `${label}与平时持平` })
    }
  })
  
  // 综合排名
  if (baseline.percentiles.currentGame >= 75) {
    statements.push({ 
      type: "positive", 
      text: `综合表现排在你近${baseline.seasonStats.totalGames}场的前25%` 
    })
  }
  
  return statements
}

// 辅助函数
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function calculateStdDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const squareDiffs = values.map(v => Math.pow(v - avg, 2))
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.round(Math.sqrt(avgSquareDiff))
}

function calculateTrend(recentScores: number[]): "improving" | "declining" | "stable" {
  if (recentScores.length < 3) return "stable"
  
  let improvingCount = 0
  let decliningCount = 0
  
  for (let i = 0; i < recentScores.length - 1; i++) {
    const diff = recentScores[i] - recentScores[i + 1]
    if (diff > 3) improvingCount++
    else if (diff < -3) decliningCount++
  }
  
  if (improvingCount >= 2) return "improving"
  if (decliningCount >= 2) return "declining"
  return "stable"
}

function generateProfile(baselines: AthleteBaseline["dimensionBaselines"]): AthleteBaseline["profile"] {
  const sortedByAvg = [...baselines].sort((a, b) => b.seasonAvg - a.seasonAvg)
  const sortedByImprovement = [...baselines].sort((a, b) => {
    const aImprovement = a.recent5Avg - a.seasonAvg
    const bImprovement = b.recent5Avg - b.seasonAvg
    return bImprovement - aImprovement
  })
  const sortedByVolatility = [...baselines].sort((a, b) => {
    const volatilityOrder = { high: 2, medium: 1, low: 0 }
    return volatilityOrder[b.consistency] - volatilityOrder[a.consistency]
  })
  
  return {
    strengthDimension: sortedByAvg[0]?.label || "",
    weaknessDimension: sortedByAvg[sortedByAvg.length - 1]?.label || "",
    mostImproved: sortedByImprovement[0]?.label || "",
    mostVolatile: sortedByVolatility[0]?.label || "",
  }
}

function calculatePercentiles(
  currentReport: ReportData,
  history: ReportData[]
): AthleteBaseline["percentiles"] {
  const allScores = [currentReport.overview.overallScore, ...history.map(r => r.overview.overallScore)]
  
  const calculatePercentile = (value: number, allValues: number[]): number => {
    const sorted = [...allValues].sort((a, b) => a - b)
    const index = sorted.indexOf(value)
    return Math.round((index / sorted.length) * 100)
  }
  
  const dimensions = ["scoring", "errorControl", "stability", "clutch"] as const
  const dimPercentiles: Record<string, number> = {}
  
  dimensions.forEach(dim => {
    const current = currentReport.subScores[dim] || 0
    const all = [current, ...history.map(r => r.subScores[dim] || 0)]
    dimPercentiles[dim] = calculatePercentile(current, all)
  })
  
  return {
    currentGame: calculatePercentile(currentReport.overview.overallScore, allScores),
    scoring: dimPercentiles.scoring,
    errorControl: dimPercentiles.errorControl,
    stability: dimPercentiles.stability,
    clutch: dimPercentiles.clutch,
  }
}

function findConsecutiveTrend(
  currentScore: number,
  historyScores: number[]
): { direction: "up" | "down" | "flat"; streak: number } {
  const allScores = [currentScore, ...historyScores]
  if (allScores.length < 2) return { direction: "flat", streak: 0 }
  
  let streak = 1
  let direction: "up" | "down" | "flat" = "flat"
  
  for (let i = 0; i < allScores.length - 1; i++) {
    const diff = allScores[i] - allScores[i + 1]
    
    if (diff > 3) {
      if (direction === "up" || direction === "flat") {
        streak++
        direction = "up"
      } else {
        break
      }
    } else if (diff < -3) {
      if (direction === "down" || direction === "flat") {
        streak++
        direction = "down"
      } else {
        break
      }
    } else {
      break
    }
  }
  
  return { direction, streak: direction === "flat" ? 0 : streak }
}

function getAthleteReportHistory(athleteId: string): ReportData[] {
  if (typeof window === "undefined") return []
  
  const reports: ReportData[] = []
  const reportList = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
  
  for (const summary of reportList) {
    if (summary.athleteId === athleteId) {
      const fullReport = localStorage.getItem(`report_${summary.id}`)
      if (fullReport) {
        reports.push(JSON.parse(fullReport))
      }
    }
  }
  
  return reports.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
