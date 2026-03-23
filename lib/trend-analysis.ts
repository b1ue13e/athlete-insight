/**
 * 趋势分析 - "和自己比"
 * 
 * 对比当前表现与历史表现
 */

import { ReportData } from "./report-engine"

export interface TrendComparison {
  // 与近5场对比
  vsRecent5: {
    scoreDiff: number
    direction: "up" | "down" | "flat"
    changePercent: number
  }
  
  // 各维度对比
  dimensionTrends: {
    dimension: string
    label: string
    current: number
    recent5Avg: number
    diff: number
    trend: "improving" | "declining" | "stable"
  }[]
  
  // 连续趋势
  consecutiveTrend: {
    direction: "improving" | "declining" | "mixed"
    streak: number
  }
  
  // 样本量提示
  sampleSize: {
    totalReports: number
    hasEnoughData: boolean
    confidence: "high" | "medium" | "low"
    message: string
  }
}

// 生成趋势对比
export function generateTrendComparison(
  currentReport: ReportData,
  athleteId: string
): TrendComparison {
  // 获取该运动员的所有历史报告
  const history = getAthleteReportHistory(athleteId)
  
  // 排除当前报告
  const pastReports = history.filter(r => r.id !== currentReport.id)
  
  // 计算样本量
  const totalReports = history.length
  const hasEnoughData = totalReports >= 3
  
  // 样本量不足时的提示
  let sampleMessage = ""
  let confidence: "high" | "medium" | "low" = "low"
  
  if (totalReports < 3) {
    sampleMessage = `仅${totalReports}场比赛数据，趋势判断需要至少3场样本`
    confidence = "low"
  } else if (totalReports < 5) {
    sampleMessage = `${totalReports}场比赛，趋势判断仅供参考`
    confidence = "medium"
  } else {
    sampleMessage = `基于${totalReports}场比赛数据`
    confidence = "high"
  }
  
  // 如果数据不足，返回简化版
  if (!hasEnoughData) {
    return {
      vsRecent5: { scoreDiff: 0, direction: "flat", changePercent: 0 },
      dimensionTrends: [],
      consecutiveTrend: { direction: "mixed", streak: 0 },
      sampleSize: {
        totalReports,
        hasEnoughData,
        confidence,
        message: sampleMessage,
      },
    }
  }
  
  // 取近5场（不包括当前）
  const recent5 = pastReports.slice(0, 5)
  const recent5AvgScore = Math.round(
    recent5.reduce((sum, r) => sum + r.overview.overallScore, 0) / recent5.length
  )
  
  // 总分变化
  const scoreDiff = currentReport.overview.overallScore - recent5AvgScore
  const changePercent = recent5AvgScore > 0 
    ? Math.round((scoreDiff / recent5AvgScore) * 100) 
    : 0
  
  const direction = scoreDiff > 3 ? "up" : scoreDiff < -3 ? "down" : "flat"
  
  // 各维度趋势
  const dimensions = [
    { key: "scoring", label: "得分贡献" },
    { key: "errorControl", label: "失误控制" },
    { key: "stability", label: "稳定性" },
    { key: "clutch", label: "关键分" },
  ]
  
  const dimensionTrends = dimensions.map(({ key, label }) => {
    const current = currentReport.subScores[key as keyof typeof currentReport.subScores] || 0
    const recent5Avg = Math.round(
      recent5.reduce((sum, r) => {
        const score = r.subScores[key as keyof typeof r.subScores] || 0
        return sum + score
      }, 0) / recent5.length
    )
    const diff = current - recent5Avg
    
    let trend: "improving" | "declining" | "stable" = "stable"
    if (diff > 5) trend = "improving"
    else if (diff < -5) trend = "declining"
    
    return {
      dimension: key,
      label,
      current,
      recent5Avg,
      diff,
      trend,
    }
  })
  
  // 连续趋势（连胜/连败）
  const consecutiveTrend = calculateConsecutiveTrend(history)
  
  return {
    vsRecent5: {
      scoreDiff,
      direction,
      changePercent,
    },
    dimensionTrends,
    consecutiveTrend,
    sampleSize: {
      totalReports,
      hasEnoughData,
      confidence,
      message: sampleMessage,
    },
  }
}

// 计算连续趋势
function calculateConsecutiveTrend(reports: ReportData[]): {
  direction: "improving" | "declining" | "mixed"
  streak: number
} {
  if (reports.length < 2) {
    return { direction: "mixed", streak: 0 }
  }
  
  // 按时间排序
  const sorted = [...reports].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  // 计算每场与上场的变化
  let improvingStreak = 0
  let decliningStreak = 0
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].overview.overallScore
    const previous = sorted[i + 1].overview.overallScore
    const diff = current - previous
    
    if (diff > 3) {
      improvingStreak++
      decliningStreak = 0
    } else if (diff < -3) {
      decliningStreak++
      improvingStreak = 0
    } else {
      // 持平，重置
      improvingStreak = 0
      decliningStreak = 0
    }
  }
  
  if (improvingStreak >= 2) {
    return { direction: "improving", streak: improvingStreak }
  } else if (decliningStreak >= 2) {
    return { direction: "declining", streak: decliningStreak }
  }
  
  return { direction: "mixed", streak: 0 }
}

// 获取运动员报告历史
function getAthleteReportHistory(athleteId: string): ReportData[] {
  if (typeof window === "undefined") return []
  
  const reports: ReportData[] = []
  
  // 从 localStorage 获取报告列表
  const reportList = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
  
  for (const summary of reportList) {
    if (summary.athleteId === athleteId) {
      const fullReport = localStorage.getItem(`report_${summary.id}`)
      if (fullReport) {
        reports.push(JSON.parse(fullReport))
      }
    }
  }
  
  // 按时间倒序
  return reports.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// 生成趋势文本描述
export function generateTrendSummary(comparison: TrendComparison): string {
  const parts: string[] = []
  
  // 样本量提示
  if (!comparison.sampleSize.hasEnoughData) {
    return comparison.sampleSize.message
  }
  
  // 总分变化
  const { direction, changePercent } = comparison.vsRecent5
  if (direction === "up") {
    parts.push(`综合表现较近5场提升${changePercent}%`)
  } else if (direction === "down") {
    parts.push(`综合表现较近5场下降${Math.abs(changePercent)}%`)
  } else {
    parts.push("综合表现与近5场持平")
  }
  
  // 维度亮点
  const improved = comparison.dimensionTrends.filter(d => d.trend === "improving")
  const declined = comparison.dimensionTrends.filter(d => d.trend === "declining")
  
  if (improved.length > 0) {
    parts.push(`，${improved.map(d => d.label).join("、")}有所改善`)
  }
  if (declined.length > 0) {
    parts.push(`，${declined.map(d => d.label).join("、")}有所下滑`)
  }
  
  // 连续趋势
  const { direction: streakDir, streak } = comparison.consecutiveTrend
  if (streak >= 2) {
    if (streakDir === "improving") {
      parts.push(`，已连续${streak}场进步`)
    } else if (streakDir === "declining") {
      parts.push(`，已连续${streak}场下滑，需关注`)
    }
  }
  
  return parts.join("")
}
