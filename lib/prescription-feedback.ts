/**
 * 处方执行回访系统
 * 
 * 追踪训练处方的执行情况和效果
 */

import { ReportData } from "./report-engine"

export interface PrescriptionFeedback {
  id: string
  reportId: string
  athleteId: string
  prescriptionId: string
  prescriptionTitle: string
  category: string
  
  // 执行情况
  executionStatus: "completed" | "partial" | "not_done" | "skipped"
  executionNote?: string
  
  // 自我感受
  perceivedEffect: "improved" | "no_change" | "worsened" | "uncertain"
  
  // 记录时间
  recordedAt: string
  
  // 关联的下一次报告（用于追踪长期效果）
  nextReportId?: string
}

export interface PrescriptionEffectSummary {
  prescriptionId: string
  title: string
  category: string
  
  // 执行统计
  totalAssigned: number
  completedCount: number
  partialCount: number
  notDoneCount: number
  executedCount: number  // 已执行次数（completed + partial）
  
  // 效果统计
  improvedCount: number
  noChangeCount: number
  worsenedCount: number
  
  // 综合有效率
  effectivenessRate: number
  
  // 趋势
  trend: "improving" | "stable" | "declining" | "insufficient_data"
  
  // 最近执行情况
  lastFeedback?: PrescriptionFeedback
}

const FEEDBACK_KEY = "prescription_feedback"

// 保存反馈
export function saveFeedback(feedback: PrescriptionFeedback): void {
  if (typeof window === "undefined") return
  
  const allFeedback = getAllFeedback()
  const existingIndex = allFeedback.findIndex(f => f.id === feedback.id)
  
  if (existingIndex >= 0) {
    allFeedback[existingIndex] = feedback
  } else {
    allFeedback.push(feedback)
  }
  
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(allFeedback))
}

// 获取所有反馈
export function getAllFeedback(): PrescriptionFeedback[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(FEEDBACK_KEY)
  return stored ? JSON.parse(stored) : []
}

// 获取运动员的反馈
export function getFeedbackByAthlete(athleteId: string): PrescriptionFeedback[] {
  return getAllFeedback().filter(f => f.athleteId === athleteId)
}

// 获取报告的反馈
export function getFeedbackByReport(reportId: string): PrescriptionFeedback[] {
  return getAllFeedback().filter(f => f.reportId === reportId)
}

// 获取上一期报告的未反馈处方
export function getPendingFeedback(athleteId: string, currentReportId?: string): PrescriptionFeedback[] {
  const allReports = getAthleteReports(athleteId)
  if (allReports.length < 2) return []
  
  // 按时间排序，找最近的一份报告
  const sortedReports = allReports.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  
  // 如果当前正在创建新报告，排除当前报告
  const lastReport = currentReportId 
    ? sortedReports.find(r => r.id !== currentReportId)
    : sortedReports[0]
  
  if (!lastReport) return []
  
  // 获取该报告的处方
  const prescriptions = generatePrescriptionsFromReport(lastReport)
  
  // 检查哪些处方还没有反馈
  const existingFeedback = getFeedbackByReport(lastReport.id)
  const feedbackIds = new Set(existingFeedback.map(f => f.prescriptionId))
  
  return prescriptions
    .filter(p => !feedbackIds.has(p.id))
    .map(p => ({
      id: `feedback_${lastReport.id}_${p.id}`,
      reportId: lastReport.id,
      athleteId,
      prescriptionId: p.id,
      prescriptionTitle: p.title,
      category: p.category,
      executionStatus: "not_done",
      perceivedEffect: "uncertain",
      recordedAt: new Date().toISOString(),
    }))
}

// 生成处方效果摘要
export function generatePrescriptionSummary(
  prescriptionId: string,
  athleteId: string
): PrescriptionEffectSummary | null {
  const feedbacks = getFeedbackByAthlete(athleteId)
    .filter(f => f.prescriptionId === prescriptionId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
  
  if (feedbacks.length === 0) return null
  
  const total = feedbacks.length
  const completed = feedbacks.filter(f => f.executionStatus === "completed").length
  const partial = feedbacks.filter(f => f.executionStatus === "partial").length
  const notDone = feedbacks.filter(f => f.executionStatus === "not_done").length
  
  const improved = feedbacks.filter(f => f.perceivedEffect === "improved").length
  const noChange = feedbacks.filter(f => f.perceivedEffect === "no_change").length
  const worsened = feedbacks.filter(f => f.perceivedEffect === "worsened").length
  
  // 有效率 = （改善次数 / 执行次数）* 100
  const executed = completed + partial
  const effectivenessRate = executed > 0 
    ? Math.round((improved / executed) * 100)
    : 0
  
  // 判断趋势
  let trend: PrescriptionEffectSummary["trend"] = "insufficient_data"
  if (feedbacks.length >= 2) {
    const recent = feedbacks.slice(0, 3)
    const recentImproved = recent.filter(f => f.perceivedEffect === "improved").length
    const recentWorsened = recent.filter(f => f.perceivedEffect === "worsened").length
    
    if (recentImproved >= 2) trend = "improving"
    else if (recentWorsened >= 2) trend = "declining"
    else trend = "stable"
  }
  
  return {
    prescriptionId,
    title: feedbacks[0].prescriptionTitle,
    category: feedbacks[0].category,
    totalAssigned: total,
    completedCount: completed,
    partialCount: partial,
    notDoneCount: notDone,
    executedCount: executed,
    improvedCount: improved,
    noChangeCount: noChange,
    worsenedCount: worsened,
    effectivenessRate,
    trend,
    lastFeedback: feedbacks[0],
  }
}

// 生成反馈提示文本（用于报告展示）
export function generateFeedbackSummary(
  prescriptionId: string,
  athleteId: string
): string | null {
  const summary = generatePrescriptionSummary(prescriptionId, athleteId)
  if (!summary) return null
  
  const parts: string[] = []
  
  // 执行率
  const executionRate = Math.round(
    ((summary.completedCount + summary.partialCount) / summary.totalAssigned) * 100
  )
  parts.push(`已执行${executionRate}%`)
  
  // 效果
  if (summary.effectivenessRate >= 70) {
    parts.push(`，有效率${summary.effectivenessRate}%，效果显著`)
  } else if (summary.effectivenessRate >= 40) {
    parts.push(`，有效率${summary.effectivenessRate}%，有一定效果`)
  } else if (summary.executedCount > 0) {
    parts.push(`，效果不明显，建议调整训练方式`)
  }
  
  // 趋势
  if (summary.trend === "improving") {
    parts.push(`，持续改善中`)
  } else if (summary.trend === "declining") {
    parts.push(`，近期效果回落`)
  }
  
  return parts.join("")
}

// 生成执行建议（基于历史反馈）
export function generateExecutionAdvice(
  prescriptionId: string,
  athleteId: string
): string | null {
  const summary = generatePrescriptionSummary(prescriptionId, athleteId)
  if (!summary) return null
  
  // 如果从未执行
  if (summary.completedCount === 0 && summary.partialCount === 0) {
    return "该处方尚未执行，建议优先完成"
  }
  
  // 如果执行但效果不佳
  if (summary.effectivenessRate < 40 && summary.executedCount >= 2) {
    return "多次执行效果不明显，建议调整训练形式或强度"
  }
  
  // 如果执行效果好
  if (summary.effectivenessRate >= 70) {
    return "该处方对你效果显著，建议继续保持"
  }
  
  return null
}

// 辅助函数
function getAthleteReports(athleteId: string): ReportData[] {
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

function generatePrescriptionsFromReport(report: ReportData) {
  // 简化版，实际应该从 report 中恢复处方
  return report.weaknesses.map((w, i) => ({
    id: `prescription_${report.id}_${i}`,
    title: `针对${w}的训练`,
    category: "综合",
  }))
}

// 获取执行统计（用于运动员主页）
export function getAthleteExecutionStats(athleteId: string) {
  const feedbacks = getFeedbackByAthlete(athleteId)
  
  if (feedbacks.length === 0) {
    return {
      totalPrescriptions: 0,
      executionRate: 0,
      averageEffectiveness: 0,
      mostEffectiveCategory: null,
    }
  }
  
  const total = feedbacks.length
  const executed = feedbacks.filter(f => 
    f.executionStatus === "completed" || f.executionStatus === "partial"
  ).length
  
  const improved = feedbacks.filter(f => f.perceivedEffect === "improved").length
  
  // 按类别统计效果
  const categoryEffects: Record<string, { count: number; improved: number }> = {}
  feedbacks.forEach(f => {
    if (!categoryEffects[f.category]) {
      categoryEffects[f.category] = { count: 0, improved: 0 }
    }
    categoryEffects[f.category].count++
    if (f.perceivedEffect === "improved") {
      categoryEffects[f.category].improved++
    }
  })
  
  // 找出最有效的类别
  let mostEffectiveCategory = null
  let maxRate = 0
  
  Object.entries(categoryEffects).forEach(([category, data]) => {
    const rate = data.improved / data.count
    if (rate > maxRate && data.count >= 2) {
      maxRate = rate
      mostEffectiveCategory = category
    }
  })
  
  return {
    totalPrescriptions: total,
    executionRate: Math.round((executed / total) * 100),
    averageEffectiveness: executed > 0 ? Math.round((improved / executed) * 100) : 0,
    mostEffectiveCategory,
  }
}
