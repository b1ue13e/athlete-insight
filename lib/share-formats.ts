/**
 * 报告分享格式生成
 * 
 * 三种输出：教练版摘要 / 图片卡片 / PDF简版
 */

import { ReportData } from "./report-engine"
import { AthleteBaseline } from "./athlete-baseline"
import { generatePrescriptions } from "./training-prescription"

// ============ 1. 教练版摘要 ============

export interface CoachSummary {
  header: {
    athleteName: string
    position: string
    matchName: string
    date: string
  }
  conclusion: {
    score: number
    verdict: string
    mainIssue: string
  }
  comparison: {
    vsSeasonAvg: number
    trend: string
  }
  prescription: {
    category: string
    title: string
    execution: string
    target: string
  } | null
  confidence: {
    level: string
    dataSource: string
  }
}

export function generateCoachSummary(
  report: ReportData,
  baseline?: AthleteBaseline
): CoachSummary {
  const prescriptions = generatePrescriptions(report.weaknesses, report.errorTags, report.position)
  const topPrescription = prescriptions[0] || null
  
  const vsSeasonAvg = baseline 
    ? report.overview.overallScore - baseline.seasonStats.averageScore
    : 0
  
  return {
    header: {
      athleteName: report.athleteName,
      position: report.position,
      matchName: report.matchName,
      date: new Date(report.createdAt).toLocaleDateString("zh-CN", {
        month: "short", day: "numeric"
      }),
    },
    conclusion: {
      score: report.overview.overallScore,
      verdict: report.overview.verdict,
      mainIssue: report.weaknesses[0] || "无明显短板",
    },
    comparison: {
      vsSeasonAvg,
      trend: vsSeasonAvg > 3 ? "高于均值" : vsSeasonAvg < -3 ? "低于均值" : "与均值持平",
    },
    prescription: topPrescription ? {
      category: topPrescription.category,
      title: topPrescription.title,
      execution: `${topPrescription.execution.duration}·${topPrescription.execution.sets}组×${topPrescription.execution.reps}`,
      target: topPrescription.successCriteria,
    } : null,
    confidence: {
      level: report.metadata.dataCertainty === "precise" ? "高" : 
             report.metadata.dataCertainty === "estimated" ? "中" : "低",
      dataSource: report.metadata.mode === "quick" ? "快速模式" : "专业模式",
    },
  }
}

export function formatCoachSummaryText(summary: CoachSummary): string {
  const lines: string[] = []
  
  lines.push(`${summary.header.athleteName} · ${summary.header.position} · ${summary.header.matchName}`)
  lines.push(``)
  lines.push(`结论：${summary.conclusion.verdict}（${summary.conclusion.score}分）`)
  lines.push(`主问题：${summary.conclusion.mainIssue}`)
  lines.push(`对比：${summary.comparison.trend}（${summary.comparison.vsSeasonAvg > 0 ? "+" : ""}${summary.comparison.vsSeasonAvg}）`)
  lines.push(`可信度：${summary.confidence.level}（${summary.confidence.dataSource}）`)
  lines.push(``)
  
  if (summary.prescription) {
    lines.push(`训练处方 P1：`)
    lines.push(`${summary.prescription.category}：${summary.prescription.title}`)
    lines.push(`量：${summary.prescription.execution}`)
    lines.push(`达标：${summary.prescription.target}`)
  }
  
  return lines.join("\n")
}

// ============ 2. 图片卡片数据 ============

export interface ShareCardData {
  athleteName: string
  position: string
  matchName: string
  score: number
  verdict: string
  oneLiner: string
  primaryWeakness: string
  primaryPrescription: string
  date: string
  brand: string
}

export function generateShareCardData(
  report: ReportData,
  baseline?: AthleteBaseline
): ShareCardData {
  const prescriptions = generatePrescriptions(report.weaknesses, report.errorTags, report.position)
  
  // 生成一句话结论
  let oneLiner = report.overview.verdict
  if (baseline && baseline.seasonStats.totalGames >= 3) {
    const percentile = baseline.percentiles.currentGame
    if (percentile >= 75) {
      oneLiner = "本场表现优异"
    } else if (percentile <= 25) {
      oneLiner = "本场低于平时水平"
    }
  }
  
  return {
    athleteName: report.athleteName,
    position: report.position,
    matchName: report.matchName,
    score: report.overview.overallScore,
    verdict: report.overview.verdict,
    oneLiner,
    primaryWeakness: report.weaknesses[0] || "表现均衡",
    primaryPrescription: prescriptions[0]?.title || "保持训练",
    date: new Date(report.createdAt).toLocaleDateString("zh-CN"),
    brand: "ATHLETE INSIGHT",
  }
}

// ============ 3. PDF 简版数据 ============

export interface PDFReportData {
  meta: {
    athleteName: string
    position: string
    matchName: string
    date: string
    generatedAt: string
  }
  overview: {
    score: number
    verdict: string
    summary: string
  }
  subScores: {
    label: string
    score: number
  }[]
  insights: string[]
  strengths: string[]
  weaknesses: string[]
  prescriptions: {
    category: string
    title: string
    description: string
    execution: string
    target: string
  }[]
  dataQuality: {
    level: string
    source: string
    note: string
  }
}

export function generatePDFData(
  report: ReportData,
  insights: string[],
  baseline?: AthleteBaseline
): PDFReportData {
  const prescriptions = generatePrescriptions(report.weaknesses, report.errorTags, report.position)
  
  return {
    meta: {
      athleteName: report.athleteName,
      position: report.position,
      matchName: report.matchName,
      date: new Date(report.createdAt).toLocaleDateString("zh-CN"),
      generatedAt: new Date().toLocaleString("zh-CN"),
    },
    overview: {
      score: report.overview.overallScore,
      verdict: report.overview.verdict,
      summary: report.overview.summary,
    },
    subScores: [
      { label: "得分贡献", score: report.subScores.scoring },
      { label: "失误控制", score: report.subScores.errorControl },
      { label: "稳定性", score: report.subScores.stability },
      { label: "关键分", score: report.subScores.clutch },
    ],
    insights: insights.slice(0, 3),
    strengths: report.strengths.slice(0, 3),
    weaknesses: report.weaknesses.slice(0, 3),
    prescriptions: prescriptions.map(p => ({
      category: p.category,
      title: p.title,
      description: p.description,
      execution: `${p.execution.duration} · ${p.execution.sets}组×${p.execution.reps}`,
      target: p.successCriteria,
    })),
    dataQuality: {
      level: report.metadata.dataCertainty === "precise" ? "高" : 
             report.metadata.dataCertainty === "estimated" ? "中" : "低",
      source: report.metadata.mode === "quick" ? "快速录入" : "专业统计",
      note: report.metadata.dataCertainty === "subjective" 
        ? "本报告部分基于主观评估，建议结合录像复盘" 
        : "本报告基于完整统计数据",
    },
  }
}

// ============ 辅助函数 ============

// 复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error("Copy failed:", err)
    return false
  }
}

// 下载文本文件
export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 生成分享文案（用于社交媒体）
export function generateSocialCaption(data: ShareCardData): string {
  const lines: string[] = []
  lines.push(`${data.athleteName} · ${data.position} · ${data.matchName}`)
  lines.push(``)
  lines.push(`综合评分：${data.score}`)
  lines.push(`结论：${data.oneLiner}`)
  lines.push(``)
  lines.push(`核心问题：${data.primaryWeakness}`)
  lines.push(`训练动作：${data.primaryPrescription}`)
  lines.push(``)
  lines.push(`—— 来自 ${data.brand}`)
  
  return lines.join("\n")
}
