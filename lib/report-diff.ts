/**
 * 报告升级 Diff 系统
 * 
 * 展示从"快速版"升级到"完整版"的差异
 * 让用户感受到补数据的价值
 */

import { ReportData } from "./report-engine"
import { DraftReport } from "./draft-reports"
import { FormCertaintyMap, calculateOverallDataQuality } from "@/types/certainty"

export interface ReportUpgradeDiff {
  // 版本信息
  fromVersion: "draft" | "complete"
  toVersion: "draft" | "complete"
  upgradeTime: string
  
  // 数据完整度变化
  dataCompleteness: {
    from: number
    to: number
    change: number
  }
  
  // 可信度变化
  confidenceLevel: {
    from: string
    to: string
    fromLabel: string
    toLabel: string
  }
  
  // 分数变化
  scoreChange: {
    overall: { from: number; to: number; change: number }
    dimensions: {
      dimension: string
      label: string
      from: number
      to: number
      change: number
      reason?: string
    }[]
  }
  
  // 新增判断
  newInsights: {
    category: string
    description: string
    reason: string
  }[]
  
  // 新增/补全的字段
  addedFields: {
    fieldId: string
    fieldName: string
    importance: "high" | "medium" | "low"
    impact: string
  }[]
  
  // 升级总结
  summary: string
}

// 生成升级 diff
export function generateUpgradeDiff(
  oldReport: ReportData,
  newReport: ReportData,
  oldCertainty: FormCertaintyMap,
  newCertainty: FormCertaintyMap,
  addedFieldIds: string[]
): ReportUpgradeDiff {
  const oldQuality = calculateOverallDataQuality(oldCertainty)
  const newQuality = calculateOverallDataQuality(newCertainty)
  
  // 数据完整度变化
  const completenessChange = newQuality.overallCertainty - oldQuality.overallCertainty
  
  // 可信度标签
  const getConfidenceLabel = (certainty: number): { level: string; label: string } => {
    if (certainty >= 80) return { level: "high", label: "高" }
    if (certainty >= 50) return { level: "medium", label: "中" }
    return { level: "low", label: "低" }
  }
  
  const oldConf = getConfidenceLabel(oldQuality.overallCertainty)
  const newConf = getConfidenceLabel(newQuality.overallCertainty)
  
  // 维度变化分析
  const dimensionChanges = analyzeDimensionChanges(oldReport, newReport, addedFieldIds)
  
  // 新增判断
  const newInsights = generateNewInsights(newReport, addedFieldIds)
  
  // 新增字段影响
  const addedFields = analyzeAddedFields(addedFieldIds, newReport)
  
  // 生成总结
  const summary = generateUpgradeSummary(
    completenessChange,
    newQuality.overallCertainty,
    newReport.overview.overallScore - oldReport.overview.overallScore,
    addedFields.length
  )
  
  return {
    fromVersion: "draft",
    toVersion: completenessChange >= 30 ? "complete" : "draft",
    upgradeTime: new Date().toISOString(),
    dataCompleteness: {
      from: oldQuality.overallCertainty,
      to: newQuality.overallCertainty,
      change: completenessChange,
    },
    confidenceLevel: {
      from: oldConf.level,
      to: newConf.level,
      fromLabel: oldConf.label,
      toLabel: newConf.label,
    },
    scoreChange: {
      overall: {
        from: oldReport.overview.overallScore,
        to: newReport.overview.overallScore,
        change: newReport.overview.overallScore - oldReport.overview.overallScore,
      },
      dimensions: dimensionChanges,
    },
    newInsights,
    addedFields,
    summary,
  }
}

// 分析各维度变化
function analyzeDimensionChanges(
  oldReport: ReportData,
  newReport: ReportData,
  addedFields: string[]
): ReportUpgradeDiff["scoreChange"]["dimensions"] {
  const dimensions = [
    { key: "scoring", label: "得分贡献" },
    { key: "errorControl", label: "失误控制" },
    { key: "stability", label: "稳定性" },
    { key: "clutch", label: "关键分表现" },
  ]
  
  return dimensions.map(({ key, label }) => {
    const oldScore = oldReport.subScores[key as keyof typeof oldReport.subScores] || 0
    const newScore = newReport.subScores[key as keyof typeof newReport.subScores] || 0
    const change = newScore - oldScore
    
    // 分析变化原因
    let reason = ""
    if (change > 5) {
      if (key === "scoring" && addedFields.some(f => ["attackKills", "serveAces", "blockPoints"].includes(f))) {
        reason = "补充了精确得分数据"
      } else if (key === "errorControl" && addedFields.some(f => ["attackErrors", "serveErrors"].includes(f))) {
        reason = "失误统计更完整"
      } else if (key === "stability" && addedFields.some(f => ["receptionSuccessRate", "digs"].includes(f))) {
        reason = "一传/防守数据补充"
      } else if (key === "clutch" && addedFields.includes("clutchPerformanceScore")) {
        reason = "关键分表现数据精确化"
      }
    }
    
    return {
      dimension: key,
      label,
      from: oldScore,
      to: newScore,
      change,
      reason,
    }
  }).filter(d => Math.abs(d.change) > 0)
}

// 生成新增判断
function generateNewInsights(
  newReport: ReportData,
  addedFields: string[]
): ReportUpgradeDiff["newInsights"] {
  const insights: ReportUpgradeDiff["newInsights"] = []
  
  // 基于新增字段生成洞察
  if (addedFields.includes("receptionSuccessRate")) {
    insights.push({
      category: "一传稳定性",
      description: "一传到位率数据已精确统计",
      reason: "补充了一传到位率精确数据",
    })
  }
  
  if (addedFields.some(f => ["attackKills", "attackErrors", "blockedTimes"].includes(f))) {
    insights.push({
      category: "进攻效率",
      description: "进攻成功率和失误分布已可精确计算",
      reason: "补充了完整进攻数据",
    })
  }
  
  if (addedFields.some(f => ["serveAces", "serveErrors"].includes(f))) {
    insights.push({
      category: "发球表现",
      description: "发球威胁与失误控制可量化评估",
      reason: "补充了完整发球数据",
    })
  }
  
  if (addedFields.includes("clutchPerformanceScore")) {
    insights.push({
      category: "关键分表现",
      description: "关键分处理能力评估更准确",
      reason: "补充了关键分精确评分",
    })
  }
  
  return insights
}

// 分析新增字段的影响
function analyzeAddedFields(
  addedFieldIds: string[],
  newReport: ReportData
): ReportUpgradeDiff["addedFields"] {
  const fieldImpactMap: Record<string, { name: string; importance: "high" | "medium" | "low"; impact: string }> = {
    receptionSuccessRate: { name: "一传到位率", importance: "high", impact: "提升稳定性评估准确度" },
    attackKills: { name: "进攻得分", importance: "high", impact: "精确计算得分贡献" },
    attackErrors: { name: "进攻失误", importance: "high", impact: "完善失误控制评估" },
    serveAces: { name: "发球ACE", importance: "medium", impact: "评估发球威胁" },
    serveErrors: { name: "发球失误", importance: "medium", impact: "评估发球稳定性" },
    blockPoints: { name: "拦网得分", importance: "medium", impact: "完善拦网表现评估" },
    digs: { name: "防守起球", importance: "medium", impact: "评估防守贡献" },
    clutchPerformanceScore: { name: "关键分表现", importance: "high", impact: "提升关键分评估可信度" },
  }
  
  return addedFieldIds
    .filter(id => fieldImpactMap[id])
    .map(id => ({
      fieldId: id,
      fieldName: fieldImpactMap[id].name,
      importance: fieldImpactMap[id].importance,
      impact: fieldImpactMap[id].impact,
    }))
}

// 生成升级总结
function generateUpgradeSummary(
  completenessChange: number,
  newCompleteness: number,
  scoreChange: number,
  addedFieldCount: number
): string {
  const parts: string[] = []
  
  // 版本升级
  if (newCompleteness >= 80) {
    parts.push("本报告已从「快速版」升级为「完整版」")
  } else {
    parts.push("本报告已从「快速版」升级为「进阶版」")
  }
  
  // 数据完整度
  parts.push(`，数据完整度提升${completenessChange}%`)
  
  // 分数变化
  if (Math.abs(scoreChange) >= 3) {
    parts.push(`，综合评分${scoreChange > 0 ? "上升" : "下降"}${Math.abs(scoreChange)}分`)
  }
  
  // 字段补充
  parts.push(`（补充${addedFieldCount}项精确数据）`)
  
  return parts.join("")
}

// 生成用户友好的升级提示
export function generateUpgradeNotification(diff: ReportUpgradeDiff): string {
  const lines: string[] = []
  
  lines.push(`✓ ${diff.summary}`)
  lines.push(``)
  lines.push(`数据可信度：${diff.confidenceLevel.fromLabel} → ${diff.confidenceLevel.toLabel}`)
  
  if (diff.scoreChange.dimensions.length > 0) {
    lines.push(``)
    lines.push(`维度变化：`)
    diff.scoreChange.dimensions.forEach(d => {
      const arrow = d.change > 0 ? "↑" : "↓"
      lines.push(`  ${d.label} ${d.from} ${arrow} ${d.to} ${d.reason ? `(${d.reason})` : ""}`)
    })
  }
  
  if (diff.newInsights.length > 0) {
    lines.push(``)
    lines.push(`新增判断：`)
    diff.newInsights.forEach(i => {
      lines.push(`  • ${i.category}：${i.description}`)
    })
  }
  
  return lines.join("\n")
}

// 比较两个报告生成变化摘要（用于历史页面显示）
export function generateChangeSummary(
  currentReport: ReportData,
  previousReport: ReportData | null
): string {
  if (!previousReport) {
    return "首次分析"
  }
  
  const scoreChange = currentReport.overview.overallScore - previousReport.overview.overallScore
  
  if (scoreChange > 5) {
    return "表现明显提升"
  } else if (scoreChange > 0) {
    return "表现小幅提升"
  } else if (scoreChange === 0) {
    return "表现持平"
  } else if (scoreChange > -5) {
    return "表现小幅下滑"
  } else {
    return "表现明显下滑"
  }
}
