/**
 * 期望得分模型 (Expected Points Model, xP)
 * 
 * 借鉴足球 xG (Expected Goals) 概念，根据进攻情境的难度赋予不同权重。
 * 同样的得分，面对三人拦网的强攻 vs 探头球，含金量完全不同。
 */

import { VolleyballFormData, VolleyballPosition } from "@/types"

// ============ 难度上下文标签 ============

export type AttackContext = 
  | "open_net"        // 空网/一对一
  | "double_block"    // 双人拦网
  | "triple_block"    // 三人拦网
  | "chaos_ball"      // 乱球/调整攻
  | "set_piece"       // 一攻到位
  | "transition"      // 防反
  | "tip_over"        // 探头球

export type ServeContext =
  | "flat"            // 平冲
  | "topspin"         // 跳发上旋
  | "float"           // 跳飘
  | "underhand"       // 下手

export type ReceptionContext =
  | "easy"            // 菜球/位置固定
  | "moderate"        // 常规发球
  | "difficult"       // 跳发/追身/死角

export interface PointContext {
  attack?: AttackContext
  serve?: ServeContext
  reception?: ReceptionContext
  isClutch?: boolean      // 关键分 (20+ 或局点)
  underPressure?: boolean // 连续多回合后
}

// ============ xP 基础权重表 ============

interface XPWeights {
  base: number           // 基础期望得分 (0-1)
  difficulty: number     // 难度系数 (0.5-2.0)
  pressure: number       // 压力系数 (0.8-1.5)
}

const attackContextWeights: Record<AttackContext, XPWeights> = {
  open_net:      { base: 0.65, difficulty: 1.0, pressure: 1.0 },
  double_block:  { base: 0.45, difficulty: 1.3, pressure: 1.0 },
  triple_block:  { base: 0.25, difficulty: 1.8, pressure: 1.1 },
  chaos_ball:    { base: 0.20, difficulty: 1.6, pressure: 1.2 },
  set_piece:     { base: 0.55, difficulty: 1.0, pressure: 0.9 },
  transition:    { base: 0.40, difficulty: 1.2, pressure: 1.1 },
  tip_over:      { base: 0.85, difficulty: 0.6, pressure: 0.9 },
}

const serveContextWeights: Record<ServeContext, XPWeights> = {
  flat:      { base: 0.15, difficulty: 1.2, pressure: 1.0 },
  topspin:   { base: 0.12, difficulty: 1.3, pressure: 1.0 },
  float:     { base: 0.10, difficulty: 1.1, pressure: 1.0 },
  underhand: { base: 0.05, difficulty: 0.8, pressure: 0.9 },
}

const receptionContextWeights: Record<ReceptionContext, XPWeights> = {
  easy:      { base: 0.90, difficulty: 0.8, pressure: 0.9 },
  moderate:  { base: 0.70, difficulty: 1.0, pressure: 1.0 },
  difficult: { base: 0.45, difficulty: 1.5, pressure: 1.2 },
}

// ============ xP 计算核心 ============

export interface XPResult {
  rawPoints: number      // 原始得分
  expectedPoints: number // 期望得分
  actualPoints: number   // 实际得分
  xpDiff: number         // xP 差值 (actual - expected)
  contextBonus: number   // 情境加成系数
  difficultyRating: string // 难度评级
}

/**
 * 计算单次进攻的期望得分
 */
export function calculateAttackXP(
  result: "kill" | "error" | "blocked" | "continue",
  context: AttackContext,
  isClutch: boolean = false
): XPResult {
  const weights = attackContextWeights[context]
  const clutchMultiplier = isClutch ? 1.2 : 1.0
  
  const expectedPoints = weights.base * weights.difficulty * weights.pressure * clutchMultiplier
  
  let actualPoints = 0
  if (result === "kill") actualPoints = 1.0
  if (result === "continue") actualPoints = 0.3 // 继续回合的期望值
  
  const xpDiff = actualPoints - expectedPoints
  const contextBonus = weights.difficulty * weights.pressure * clutchMultiplier
  
  // 难度评级
  let difficultyRating = "普通"
  if (contextBonus >= 1.8) difficultyRating = "极高"
  else if (contextBonus >= 1.4) difficultyRating = "高"
  else if (contextBonus >= 1.1) difficultyRating = "中等"
  else if (contextBonus <= 0.7) difficultyRating = "简单"
  
  return {
    rawPoints: actualPoints,
    expectedPoints: Math.round(expectedPoints * 100) / 100,
    actualPoints: Math.round(actualPoints * 100) / 100,
    xpDiff: Math.round(xpDiff * 100) / 100,
    contextBonus: Math.round(contextBonus * 100) / 100,
    difficultyRating,
  }
}

/**
 * 计算整场比赛的 xP 汇总
 */
export interface MatchXPAnalysis {
  totalKills: number
  totalExpectedKills: number
  xpDiff: number
  highDifficultyKills: number      // 高难度得分统计
  clutchKills: number              // 关键分得分
  efficiencyRating: number         // 基于xP的效率评分
  contextBreakdown: {
    openNet: { kills: number; attempts: number }
    againstBlock: { kills: number; attempts: number }
    chaos: { kills: number; attempts: number }
    tipOver: { kills: number; attempts: number }
  }
}

export function calculateMatchXP(
  attacks: Array<{ result: "kill" | "error" | "blocked"; context: AttackContext; isClutch?: boolean }>
): MatchXPAnalysis {
  let totalExpectedKills = 0
  let totalKills = 0
  let highDifficultyKills = 0
  let clutchKills = 0
  
  const contextBreakdown = {
    openNet: { kills: 0, attempts: 0 },
    againstBlock: { kills: 0, attempts: 0 },
    chaos: { kills: 0, attempts: 0 },
    tipOver: { kills: 0, attempts: 0 },
  }
  
  for (const attack of attacks) {
    const xp = calculateAttackXP(attack.result, attack.context, attack.isClutch)
    totalExpectedKills += xp.expectedPoints
    
    if (attack.result === "kill") {
      totalKills++
      if (xp.difficultyRating === "高" || xp.difficultyRating === "极高") {
        highDifficultyKills++
      }
      if (attack.isClutch) clutchKills++
    }
    
    // 情境分类统计
    if (attack.context === "open_net" || attack.context === "set_piece") {
      contextBreakdown.openNet.attempts++
      if (attack.result === "kill") contextBreakdown.openNet.kills++
    } else if (attack.context === "double_block" || attack.context === "triple_block") {
      contextBreakdown.againstBlock.attempts++
      if (attack.result === "kill") contextBreakdown.againstBlock.kills++
    } else if (attack.context === "chaos_ball" || attack.context === "transition") {
      contextBreakdown.chaos.attempts++
      if (attack.result === "kill") contextBreakdown.chaos.kills++
    } else if (attack.context === "tip_over") {
      contextBreakdown.tipOver.attempts++
      if (attack.result === "kill") contextBreakdown.tipOver.kills++
    }
  }
  
  const xpDiff = totalKills - totalExpectedKills
  
  // 基于 xP 差值的效率评分 (0-100)
  // 正差值表示超常发挥，负差值表示低于预期
  const efficiencyRating = Math.min(100, Math.max(0, 50 + xpDiff * 10))
  
  return {
    totalKills,
    totalExpectedKills: Math.round(totalExpectedKills * 10) / 10,
    xpDiff: Math.round(xpDiff * 10) / 10,
    highDifficultyKills,
    clutchKills,
    efficiencyRating: Math.round(efficiencyRating),
    contextBreakdown,
  }
}

// ============ 与现有评分系统集成 ============

export interface XPAdjustedScore {
  rawScore: number
  xpAdjustedScore: number
  adjustmentFactor: number
  explanation: string
}

/**
 * 将 xP 模型应用到现有评分中
 */
export function applyXPAdjustment(
  baseScore: number,
  matchXP: MatchXPAnalysis,
  position: VolleyballPosition
): XPAdjustedScore {
  // 根据位置的 xP 权重
  const positionXPWeight: Record<VolleyballPosition, number> = {
    "主攻": 0.25,
    "接应": 0.25,
    "副攻": 0.20,
    "二传": 0.15,
    "自由人": 0.10, // 自由人进攻少，xP 权重低
  }
  
  const weight = positionXPWeight[position] || 0.20
  
  // 高难度得分 bonus
  const highDifficultyBonus = matchXP.highDifficultyKills * 2
  
  // 关键分 bonus
  const clutchBonus = matchXP.clutchKills * 1.5
  
  // xP 效率调整 (超常发挥加分，低于预期减分)
  const efficiencyAdjustment = matchXP.xpDiff * 3
  
  const totalAdjustment = highDifficultyBonus + clutchBonus + efficiencyAdjustment
  const adjustmentFactor = 1 + (totalAdjustment / 100) * weight
  
  const xpAdjustedScore = Math.min(100, Math.max(0, baseScore * adjustmentFactor))
  
  // 生成解释文本
  const explanations: string[] = []
  if (matchXP.highDifficultyKills > 0) {
    explanations.push(`${matchXP.highDifficultyKills}个高难度得分`)
  }
  if (matchXP.clutchKills > 0) {
    explanations.push(`${matchXP.clutchKills}个关键分`)
  }
  if (matchXP.xpDiff > 0.5) {
    explanations.push(`xP效率+${Math.round(matchXP.xpDiff * 100)}%`)
  } else if (matchXP.xpDiff < -0.5) {
    explanations.push(`xP效率${Math.round(matchXP.xpDiff * 100)}%`)
  }
  
  const explanation = explanations.length > 0
    ? `情境加成：${explanations.join("，")}`
    : "基于标准情境"
  
  return {
    rawScore: baseScore,
    xpAdjustedScore: Math.round(xpAdjustedScore),
    adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
    explanation,
  }
}

// ============ 简易录入接口 ============

/**
 * 从简单描述推断攻击情境
 * 用于语音/快速录入后的自动解析
 */
export function inferAttackContext(description: string): AttackContext {
  const desc = description.toLowerCase()
  
  if (desc.includes("探头") || desc.includes("探球")) return "tip_over"
  if (desc.includes("三人") || desc.includes("三拦")) return "triple_block"
  if (desc.includes("双人") || desc.includes("双拦")) return "double_block"
  if (desc.includes("乱球") || desc.includes("调整") || desc.includes("倒")) return "chaos_ball"
  if (desc.includes("一攻") || desc.includes("到位")) return "set_piece"
  if (desc.includes("防反") || desc.includes("反击")) return "transition"
  
  return "open_net"
}
