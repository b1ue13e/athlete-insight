/**
 * 报告生成引擎
 * 
 * 将输入数据转换为分析报告
 */

import { FormMetadata } from "@/types/input"
import { AthleteProfile } from "./athletes"
import { generateId } from "./utils"

export interface ReportData {
  id: string
  athleteId: string
  athleteName: string
  matchName: string
  opponent?: string
  position: string
  matchDate: string
  createdAt: string
  
  // 报告概览
  overview: {
    overallScore: number
    verdict: string
    summary: string
  }
  
  // 维度得分
  subScores: {
    scoring: number
    errorControl: number
    stability: number
    clutch: number
  }
  
  // 优势与问题
  strengths: string[]
  weaknesses: string[]
  errorTags: string[]
  
  // 建议
  recommendations: {
    highPriority: string[]
    mediumPriority: string[]
    lowPriority: string[]
  }
  
  // 元数据
  metadata: FormMetadata
  
  // 原始输入
  rawInput: any
}

// 生成报告
export function generateReport(
  input: any,
  athlete: AthleteProfile,
  metadata: FormMetadata
): ReportData {
  // 计算各维度得分
  const subScores = calculateSubScores(input)
  
  // 计算总分
  const overallScore = Math.round(
    subScores.scoring * 0.35 +
    subScores.errorControl * 0.30 +
    subScores.stability * 0.20 +
    subScores.clutch * 0.15
  )
  
  // 生成结论
  const verdict = generateVerdict(overallScore, input)
  
  // 生成摘要
  const summary = generateSummary(input, overallScore, subScores)
  
  // 分析优势
  const strengths = analyzeStrengths(input, subScores)
  
  // 分析问题
  const weaknesses = analyzeWeaknesses(input, subScores)
  
  // 生成建议
  const recommendations = generateRecommendations(input, subScores, weaknesses)
  
  return {
    id: generateId(),
    athleteId: athlete.id,
    athleteName: athlete.name,
    matchName: input.matchName,
    opponent: input.opponent,
    position: input.position,
    matchDate: input.matchDate,
    createdAt: new Date().toISOString(),
    overview: {
      overallScore,
      verdict,
      summary,
    },
    subScores,
    strengths,
    weaknesses,
    errorTags: input.errorTags || [],
    recommendations,
    metadata,
    rawInput: input,
  }
}

// 计算各维度得分
function calculateSubScores(input: any) {
  if (input.mode === "quick") {
    // 快速模式：直接使用评估分数
    return {
      scoring: input.scoringRating || 60,
      errorControl: input.errorRating || 60,
      stability: input.receptionRating || 60,
      clutch: input.clutchRating || 60,
    }
  }
  
  // 专业模式：基于统计数据计算
  const totalAttempts = (input.attackKills || 0) + (input.attackErrors || 0) + (input.blockedTimes || 0)
  const attackEfficiency = totalAttempts > 0 
    ? ((input.attackKills || 0) - (input.attackErrors || 0) - (input.blockedTimes || 0)) / totalAttempts
    : 0
  
  // 得分贡献：基于发球ACE、进攻得分、拦网
  const scoring = Math.min(95, Math.max(30, 50 + 
    (input.serveAces || 0) * 5 +
    (input.attackKills || 0) * 3 +
    (input.blockPoints || 0) * 4 +
    attackEfficiency * 20
  ))
  
  // 失误控制
  const totalErrors = (input.serveErrors || 0) + (input.attackErrors || 0)
  const errorControl = Math.min(95, Math.max(30, 80 - totalErrors * 5))
  
  // 稳定性：基于一传、防守
  let stability = 60
  if (input.receptionInputMode === "precise" && input.receptionSuccessRate !== undefined) {
    stability = input.receptionSuccessRate
  } else if (input.receptionRating !== undefined) {
    const ratingMap: Record<string, number> = {
      excellent: 85, good: 72, average: 60, poor: 45, very_poor: 30
    }
    stability = ratingMap[input.receptionRating] || 60
  }
  stability = Math.min(95, Math.max(30, stability + (input.digs || 0) * 2))
  
  // 关键分
  let clutch = 60
  if (input.clutchInputMode === "precise" && input.clutchPerformanceScore !== undefined) {
    clutch = input.clutchPerformanceScore
  } else if (input.clutchRating !== undefined) {
    const ratingMap: Record<string, number> = {
      excellent: 85, good: 72, average: 60, poor: 45, very_poor: 30
    }
    clutch = ratingMap[input.clutchRating] || 60
  }
  
  return {
    scoring: Math.round(scoring),
    errorControl: Math.round(errorControl),
    stability: Math.round(stability),
    clutch: Math.round(clutch),
  }
}

// 生成结论
function generateVerdict(score: number, input: any): string {
  if (score >= 80) return "表现出色"
  if (score >= 70) return "发挥良好"
  if (score >= 60) return "表现中等"
  if (score >= 50) return "发挥欠佳"
  return "需要改进"
}

// 生成摘要
function generateSummary(input: any, score: number, subScores: any): string {
  const parts: string[] = []
  
  // 比赛背景
  parts.push(`${input.matchName}`)
  if (input.opponent) parts.push(`对阵${input.opponent}`)
  
  // 位置
  parts.push(`，以${input.position}身份`)
  
  // 出场情况
  const participationMap: Record<string, string> = {
    starter: "首发打满全场",
    mid_game: "首发出场部分时间",
    substitute: "替补出场",
  }
  parts.push(participationMap[input.starterStatus] || "出场")
  
  // 总体评价
  if (score >= 75) {
    parts.push("，整体表现优秀")
  } else if (score >= 60) {
    parts.push("，表现中规中矩")
  } else {
    parts.push("，表现有待提升")
  }
  
  // 突出维度
  const entries = Object.entries(subScores) as [string, number][]
  const maxDim = entries.sort((a, b) => b[1] - a[1])[0]
  const dimNames: Record<string, string> = {
    scoring: "得分贡献",
    errorControl: "失误控制",
    stability: "稳定性",
    clutch: "关键分表现",
  }
  parts.push(`，${dimNames[maxDim[0]] || maxDim[0]}是亮点`)
  
  return parts.join("")
}

// 分析优势
function analyzeStrengths(input: any, subScores: any): string[] {
  const strengths: string[] = []
  
  // 基于高分维度
  if (subScores.scoring >= 75) {
    if (input.serveAces >= 2) strengths.push("发球威胁大，多次直接得分")
    if (input.attackKills >= 5) strengths.push("进攻效率高，下球能力强")
    if (input.blockPoints >= 3) strengths.push("拦网有建树")
    if (strengths.length === 0) strengths.push("整体得分贡献突出")
  }
  
  if (subScores.errorControl >= 75) {
    strengths.push("失误控制良好，打法稳健")
  }
  
  if (subScores.stability >= 75) {
    if (input.position === "libero" || input.position === "自由人") {
      strengths.push("防守和一传稳定，保障环节出色")
    } else {
      strengths.push("技术发挥稳定，接发球环节有保障")
    }
  }
  
  if (subScores.clutch >= 75) {
    strengths.push("关键分敢打敢拼，心理素质过硬")
  }
  
  // 基于文本输入
  if (input.topStrength) {
    strengths.push(input.topStrength)
  }
  
  // 去重并限制数量
  return Array.from(new Set(strengths)).slice(0, 3)
}

// 分析问题
function analyzeWeaknesses(input: any, subScores: any): string[] {
  const weaknesses: string[] = []
  
  // 基于低分维度
  if (subScores.scoring <= 50) {
    weaknesses.push("得分贡献不足，主动得分手段有限")
  }
  
  if (subScores.errorControl <= 50) {
    weaknesses.push("失误偏多，需要提高稳定性")
  }
  
  if (subScores.stability <= 50) {
    if (input.position === "libero" || input.position === "自由人") {
      weaknesses.push("一传或防守存在明显漏洞")
    } else {
      weaknesses.push("接发球/防守环节需要加强")
    }
  }
  
  if (subScores.clutch <= 50) {
    weaknesses.push("关键分处理急躁或保守，局末容易失常")
  }
  
  // 基于文本输入
  if (input.topWeakness) {
    weaknesses.push(input.topWeakness)
  }
  
  // 去重并限制数量
  return Array.from(new Set(weaknesses)).slice(0, 3)
}

// 生成建议
function generateRecommendations(
  input: any,
  subScores: any,
  weaknesses: string[]
): ReportData["recommendations"] {
  const highPriority: string[] = []
  const mediumPriority: string[] = []
  const lowPriority: string[] = []
  
  // 高优先级：针对严重问题
  if (subScores.errorControl <= 50) {
    highPriority.push("减少无谓失误，加强基本功训练")
  }
  if (subScores.stability <= 50) {
    highPriority.push("强化一传/防守专项训练")
  }
  if (subScores.clutch <= 50) {
    highPriority.push("增加关键分模拟训练，提升心理稳定性")
  }
  
  // 中优先级：针对中等问题
  if (subScores.scoring >= 50 && subScores.scoring <= 70) {
    mediumPriority.push("丰富进攻手段，提高得分效率")
  }
  
  // 基于错误标签
  if (input.errorTags?.includes("judgment-error")) {
    mediumPriority.push("加强比赛录像学习，提升决策能力")
  }
  if (input.errorTags?.includes("technique-error")) {
    mediumPriority.push("针对技术动作进行分解训练")
  }
  if (input.errorTags?.includes("communication-error")) {
    mediumPriority.push("增加配合训练，提高团队默契")
  }
  
  // 低优先级：锦上添花
  if (subScores.scoring >= 75) {
    lowPriority.push("保持得分状态，尝试更多变化")
  }
  if (highPriority.length === 0 && mediumPriority.length === 0) {
    lowPriority.push("继续保持良好状态，冲击更高水平")
  }
  
  return {
    highPriority: highPriority.slice(0, 2),
    mediumPriority: mediumPriority.slice(0, 2),
    lowPriority: lowPriority.slice(0, 2),
  }
}
