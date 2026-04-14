/**
 * AI 数据分析师 - 结构化Prompt与因果推理
 * 
 * 核心理念：把大模型当做"数据分析师"而不是"文案员"。
 * 让 AI 通过上下文找出隐藏的模式，输出教练级洞察。
 */

import { ReportJSON, SubScores } from "@/types"
import { PlayerAbilityProfile } from "./bayesian-baseline"

// ============ 比赛流数据结构 ============

/**
 * 序列化的比赛事件流
 * 用于让 AI 分析时间序列模式
 */
export interface GameEvent {
  timestamp: string          // 事件时间 (如 "23:15")
  set: number               // 第几局
  score: string             // 当时比分 (如 "23:21")
  action: GameAction
  result: "success" | "error" | "neutral"
  context?: {
    heartRate?: number       // 心率 (如有穿戴设备)
    fatigue?: number         // 疲劳度估计 0-10
    pressure?: number        // 压力情境 0-10
    consecutiveRallies?: number // 连续多回合数
  }
}

export type GameAction =
  | { type: "serve"; detail: "ace" | "error" | "in_play" }
  | { type: "reception"; quality: "perfect" | "good" | "poor" | "error" }
  | { type: "set"; location: "4" | "3" | "2" | "back_row" | "error" }
  | { type: "attack"; kill: boolean; context: "open" | "blocked" | "chaos"; position: string }
  | { type: "block"; point: boolean }
  | { type: "dig"; quality: "perfect" | "good" | "poor" }
  | { type: "timeout"; triggeredBy: "score_run" | "momentum_shift" | "scheduled" }

// ============ 结构化 Prompt 构建 ============

export interface AnalysisPayload {
  meta: {
    matchName: string
    date: string
    position: string
    opponentStrength: "weak" | "average" | "strong" | "elite"
    matchImportance: "training" | "regular" | "playoff" | "final"
  }
  scoreBreakdown: SubScores & { overall: number }
  eventStream: GameEvent[]
  baseline: {
    seasonAverage: SubScores
    recentTrend: "improving" | "declining" | "stable"
    bayesianProfile?: PlayerAbilityProfile
  }
  physiological?: {
    avgHeartRate?: number
    maxHeartRate?: number
    hrDecoupling?: number // 心率漂移 (跑步概念，排球可类比)
  }
}

/**
 * 构建数据分析师 System Prompt
 */
export function buildAnalystSystemPrompt(): string {
  return `你是一位专业排球数据分析师，擅长从比赛流数据中挖掘因果模式和隐藏洞察。

## 分析原则
1. **因果推理优先**: 不要只描述"发生了什么"，要分析"为什么会发生"
2. **基于证据**: 每个结论必须有具体数据支撑
3. **可操作**: 洞察必须能转化为具体的训练或比赛策略

## 分析框架

### 1. 情境模式识别
- 识别特定情境下的表现模式 (如：连续防守后的进攻效率)
- 分析心理压力点 (关键分、连续失误后)
- 体能临界点检测 (基于心率/回合数/失误类型变化)

### 2. 因果关系推断
- A 事件是否导致 B 结果？
- 相关性 vs 因果性区分
- 混淆变量控制

### 3. 预测性洞察
- 基于当前模式，预测未来风险点
- 对手针对性策略建议

## 输出格式 (JSON)
{
  "causalInsights": [
    {
      "pattern": "发现的具体模式",
      "evidence": "支撑数据",
      "mechanism": "可能的因果机制",
      "confidence": "high/medium/low",
      "actionable": "具体行动建议"
    }
  ],
  "fatigueAnalysis": {
    "detected": boolean,
    "criticalPoint": "第几局/时间段",
    "symptoms": ["症状列表"],
    "recommendation": "应对策略"
  },
  "pressureResponse": {
    "clutchPerformance": "关键分表现分析",
    "patterns": ["压力下行为模式"],
    "improvement": "提升建议"
  },
  "riskPrediction": [
    {
      "risk": "风险描述",
      "probability": "high/medium/low",
      "trigger": "触发条件",
      "mitigation": "预防措施"
    }
  ]
}`
}

/**
 * 构建用户 Prompt (包含完整比赛流)
 */
export function buildAnalystUserPrompt(payload: AnalysisPayload): string {
  const sections: string[] = []
  
  // 元信息
  sections.push(`## 比赛信息`)
  sections.push(`- 比赛: ${payload.meta.matchName}`)
  sections.push(`- 日期: ${payload.meta.date}`)
  sections.push(`- 位置: ${payload.meta.position}`)
  sections.push(`- 对手强度: ${payload.meta.opponentStrength}`)
  sections.push(`- 比赛重要性: ${payload.meta.matchImportance}`)
  
  // 评分
  sections.push(`\n## 评分数据`)
  sections.push(`- 综合评分: ${payload.scoreBreakdown.overall}`)
  sections.push(`- 得分贡献: ${payload.scoreBreakdown.scoring_contribution}`)
  sections.push(`- 失误控制: ${payload.scoreBreakdown.error_control}`)
  sections.push(`- 稳定性: ${payload.scoreBreakdown.stability}`)
  sections.push(`- 关键分: ${payload.scoreBreakdown.clutch_performance}`)
  
  // 历史对比
  sections.push(`\n## 历史对比`)
  sections.push(`- 近期趋势: ${payload.baseline.recentTrend}`)
  sections.push(`- 赛季平均: 得分${payload.baseline.seasonAverage.scoring_contribution}, 失误${payload.baseline.seasonAverage.error_control}, 稳定${payload.baseline.seasonAverage.stability}, 关键分${payload.baseline.seasonAverage.clutch_performance}`)
  
  // 比赛流 (序列化)
  if (payload.eventStream.length > 0) {
    sections.push(`\n## 比赛事件流 (${payload.eventStream.length} 个事件)`)
    
    // 按时间排序并格式化
    const sortedEvents = [...payload.eventStream].sort((a, b) => 
      a.timestamp.localeCompare(b.timestamp)
    )
    
    sortedEvents.forEach(event => {
      const ctx = event.context ? 
        `[压力${event.context.pressure || '-'}/疲劳${event.context.fatigue || '-'}]` : ''
      sections.push(`- ${event.timestamp} 局${event.set} ${event.score}: ${formatAction(event.action)} → ${event.result} ${ctx}`)
    })
  }
  
  // 生理数据
  if (payload.physiological) {
    sections.push(`\n## 生理数据`)
    if (payload.physiological.avgHeartRate) {
      sections.push(`- 平均心率: ${payload.physiological.avgHeartRate} bpm`)
    }
    if (payload.physiological.maxHeartRate) {
      sections.push(`- 最大心率: ${payload.physiological.maxHeartRate} bpm`)
    }
    if (payload.physiological.hrDecoupling) {
      sections.push(`- 心率漂移: ${payload.physiological.hrDecoupling}%`)
    }
  }
  
  sections.push(`\n## 分析任务`)
  sections.push(`1. 从比赛流中识别出 2-3 个关键因果模式`)
  sections.push(`2. 分析是否存在体能临界点`)
  sections.push(`3. 评估关键分处理能力`)
  sections.push(`4. 预测下场比赛的风险点`)
  sections.push(`5. 给出可操作的改进建议`)
  
  return sections.join("\n")
}

function formatAction(action: GameAction): string {
  switch (action.type) {
    case "serve":
      return `发球${action.detail === "ace" ? "ACE" : action.detail === "error" ? "失误" : ""}`
    case "reception":
      return `一传${action.quality}`
    case "set":
      return `传球${action.location}`
    case "attack":
      return `${action.position}进攻${action.kill ? "得分" : "未中"}(${action.context})`
    case "block":
      return `拦网${action.point ? "得分" : ""}`
    case "dig":
      return `防守${action.quality}`
    case "timeout":
      return `暂停(${action.triggeredBy})`
    default:
      return "未知动作"
  }
}

// ============ 因果模式检测 (客户端预分析) ============

export interface CausalPattern {
  type: "fatigue" | "pressure" | "momentum" | "matchup"
  description: string
  evidence: string[]
  confidence: "high" | "medium" | "low"
}

/**
 * 客户端预分析：检测常见因果模式
 * 减少 API 调用成本，提供结构化输入给 AI
 */
export function detectCausalPatterns(events: GameEvent[]): CausalPattern[] {
  const patterns: CausalPattern[] = []
  
  // 1. 体能疲劳检测
  const fatiguePattern = detectFatiguePattern(events)
  if (fatiguePattern) patterns.push(fatiguePattern)
  
  // 2. 心理压力检测
  const pressurePattern = detectPressurePattern(events)
  if (pressurePattern) patterns.push(pressurePattern)
  
  // 3. 动量转换检测
  const momentumPattern = detectMomentumPattern(events)
  if (momentumPattern) patterns.push(momentumPattern)
  
  return patterns
}

function detectFatiguePattern(events: GameEvent[]): CausalPattern | null {
  // 寻找：连续多回合后失误率上升的模式
  const rallyEvents = events.filter(e => e.context?.consecutiveRallies && e.context.consecutiveRallies > 3)
  
  if (rallyEvents.length < 3) return null
  
  const errorRate = rallyEvents.filter(e => e.result === "error").length / rallyEvents.length
  
  if (errorRate > 0.5) {
    return {
      type: "fatigue",
      description: "连续多回合后失误率显著上升",
      evidence: [
        `${rallyEvents.length} 次长回合后，失误率 ${(errorRate * 100).toFixed(0)}%`,
        "建议关注体能分配和回合转换策略",
      ],
      confidence: errorRate > 0.7 ? "high" : "medium",
    }
  }
  
  return null
}

function detectPressurePattern(events: GameEvent[]): CausalPattern | null {
  // 寻找：关键分 (20+) 表现模式
  const clutchEvents = events.filter(e => {
    const score = e.score.split(":").map(Number)
    return score.some(s => s >= 20)
  })
  
  if (clutchEvents.length < 5) return null
  
  const successRate = clutchEvents.filter(e => e.result === "success").length / clutchEvents.length
  
  if (successRate < 0.4) {
    return {
      type: "pressure",
      description: "关键分处理能力待提升",
      evidence: [
        `局末(20+)得分率仅 ${(successRate * 100).toFixed(0)}%`,
        "高压情境下技术动作容易变形",
      ],
      confidence: "medium",
    }
  }
  
  return null
}

function detectMomentumPattern(events: GameEvent[]): CausalPattern | null {
  // 寻找：连续得分/失误的模式
  let maxStreak = 0
  let currentStreak = 0
  let streakType: "success" | "error" | null = null
  
  for (const event of events) {
    if (event.result === "success" || event.result === "error") {
      if (streakType === event.result) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        streakType = event.result
        currentStreak = 1
      }
    }
  }
  
  if (maxStreak >= 4) {
    return {
      type: "momentum",
      description: "存在明显的状态波动",
      evidence: [
        `检测到位 ${maxStreak} 连击/连失的模式`,
        "建议研究如何主动打断对手势头，保持自身节奏",
      ],
      confidence: "medium",
    }
  }
  
  return null
}

// ============ 输出解析与格式化 ============

export interface AIInsight {
  type: "causal" | "fatigue" | "pressure" | "risk"
  title: string
  insight: string
  evidence: string
  recommendation: string
  confidence: "high" | "medium" | "low"
}

export function parseAIResponse(responseText: string): AIInsight[] {
  try {
    const parsed = JSON.parse(responseText)
    const insights: AIInsight[] = []
    
    // 解析因果洞察
    if (parsed.causalInsights) {
      parsed.causalInsights.forEach((ci: any) => {
        insights.push({
          type: "causal",
          title: ci.pattern,
          insight: ci.mechanism,
          evidence: ci.evidence,
          recommendation: ci.actionable,
          confidence: ci.confidence,
        })
      })
    }
    
    // 解析疲劳分析
    if (parsed.fatigueAnalysis?.detected) {
      insights.push({
        type: "fatigue",
        title: "体能临界点检测",
        insight: `在 ${parsed.fatigueAnalysis.criticalPoint} 检测到体能下降`,
        evidence: parsed.fatigueAnalysis.symptoms.join(", "),
        recommendation: parsed.fatigueAnalysis.recommendation,
        confidence: "medium",
      })
    }
    
    // 解析压力响应
    if (parsed.pressureResponse) {
      insights.push({
        type: "pressure",
        title: "关键分表现分析",
        insight: parsed.pressureResponse.clutchPerformance,
        evidence: parsed.pressureResponse.patterns.join("; "),
        recommendation: parsed.pressureResponse.improvement,
        confidence: "medium",
      })
    }
    
    // 解析风险预测
    if (parsed.riskPrediction) {
      parsed.riskPrediction.forEach((risk: any) => {
        insights.push({
          type: "risk",
          title: `风险预警: ${risk.risk}`,
          insight: `触发条件: ${risk.trigger}`,
          evidence: `概率评估: ${risk.probability}`,
          recommendation: risk.mitigation,
          confidence: risk.probability === "high" ? "high" : "medium",
        })
      })
    }
    
    return insights
  } catch (e) {
    console.error("Failed to parse AI response:", e)
    return []
  }
}

/**
 * 格式化洞察用于展示
 */
export function formatInsightForDisplay(insight: AIInsight): {
  title: string
  content: string
  badge: { text: string; color: string }
} {
  const typeLabels: Record<string, { text: string; color: string }> = {
    causal: { text: "因果洞察", color: "#8b5cf6" },
    fatigue: { text: "体能分析", color: "#f59e0b" },
    pressure: { text: "心理分析", color: "#ec4899" },
    risk: { text: "风险预警", color: "#ef4444" },
  }
  
  const confidenceColors = {
    high: "#22c55e",
    medium: "#3b82f6",
    low: "#6b7280",
  }
  
  const content = `${insight.insight}\n\n证据: ${insight.evidence}\n\n建议: ${insight.recommendation}`
  
  return {
    title: insight.title,
    content,
    badge: {
      text: `${typeLabels[insight.type].text} · ${insight.confidence === "high" ? "高置信" : insight.confidence === "medium" ? "中置信" : "参考"}`,
      color: typeLabels[insight.type].color,
    },
  }
}
