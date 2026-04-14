/**
 * AI 分析师评估矩阵 (AI Analyst Evaluation Rubric)
 * 
 * 核心原则：对 ai-analyst.ts 进行冷酷的评估
 * 不容忍任何泛泛而谈的 AI 生成内容
 * 
 * 评估维度：
 * 1. 因果推理准确度 (Accuracy)
 * 2. 动作库匹配精准度 (Relevance)  
 * 3. 可执行性 (Actionability)
 * 
 * 红线：可执行性 ≤ 2分 → 立即修改 training-vector-store.ts 或 Prompt
 */

import { TrainingPrescriptionV2 } from "./training-vector-store"

// ============ AI 洞察数据结构 ============

export interface AIInsightForEvaluation {
  id: string
  sessionId: string
  playerId: string
  playerName: string
  matchName: string
  
  // AI 生成的洞察
  insights: Array<{
    type: "causal" | "fatigue" | "pressure" | "risk"
    title: string
    insight: string
    evidence: string
    recommendation: string
  }>
  
  // AI 推荐的训练处方
  prescriptions: TrainingPrescriptionV2[]
  
  // 原始数据参考
  rawData: {
    score: number
    weaknesses: string[]
    errorTags: string[]
  }
}

// ============ 教练评估数据结构 ============

export interface CoachAIEvaluation {
  evaluationId: string
  coachId: string
  coachName: string
  evaluationDate: string
  
  // 盲测设计：教练在不知道这是AI生成的情况下评估
  insightEvaluation: Array<{
    insightId: string
    
    // 三个核心维度 (1-5分)
    scores: {
      accuracy: number      // 因果推理准确度
      relevance: number     // 动作库匹配精准度
      actionability: number // 可执行性
    }
    
    // 详细反馈
    feedback: {
      accuracyComment: string    // 为什么给这个准确度分数
      relevanceComment: string   // 处方是否真能解决问题
      actionabilityComment: string // 明天训练能用吗？
    }
    
    // 红线条款
    isNonsense: boolean         // 是否废话/胡说
    isDangerous: boolean        // 是否可能导致受伤
    
    // 改进建议
    improvementSuggestion?: string
  }>
  
  // 整体评估
  overall: {
    avgAccuracy: number
    avgRelevance: number
    avgActionability: number
    wouldUseInPractice: boolean  // 是否会在实战中参考
    generalComment: string
  }
  
  // 签名
  coachSignature: string
}

// ============ 评估矩阵标准 ============

export const EVALUATION_RUBRIC = {
  accuracy: {
    name: "因果推理准确度",
    description: "AI 找出的原因是否符合场上真实情况？",
    levels: {
      5: "完全准确：因果推理与场上观察完全一致，证据充分",
      4: "基本准确：主要因果关系正确，细节有轻微偏差",
      3: "部分准确：部分因果关系正确，但存在明显遗漏或错误",
      2: "勉强相关：因果关系牵强，证据不足",
      1: "完全错误：因果推理与实际情况完全不符"
    }
  },
  
  relevance: {
    name: "动作库匹配精准度",
    description: "推荐的训练处方是否真能解决诊断出的问题？",
    levels: {
      5: "完美匹配：处方直击问题核心，针对性强",
      4: "高度相关：处方能有效解决问题， minor改进空间",
      3: "基本相关：处方与问题相关，但不够精准",
      2: "弱相关：处方与问题关系不大，效果存疑",
      1: "不相关：处方与问题完全不匹配"
    }
  },
  
  actionability: {
    name: "可执行性",
    description: "这套训练方案在明天的校队训练中能不能直接落地？",
    levels: {
      5: "立即可用：方案详细具体，明天就能执行",
      4: "稍作调整：方案基本可用，需要 minor 调整",
      3: "需要改编：方案方向正确，但需要重新设计具体动作",
      2: "难以执行：方案过于笼统或条件不满足，难以落地",
      1: "无法执行：方案不现实或危险，不能用"
    }
  }
}

// ============ 评估结果分析 ============

export interface AIEvaluationReport {
  totalEvaluations: number
  totalInsights: number
  
  // 平均分
  averages: {
    accuracy: number
    relevance: number
    actionability: number
    overall: number
  }
  
  // 分布
  distribution: {
    accuracy: Record<number, number>
    relevance: Record<number, number>
    actionability: Record<number, number>
  }
  
  // 红线违规
  redLineViolations: {
    actionabilityLow: number     // 可执行性 ≤ 2 的次数
    nonsenseCount: number        // 废话/胡说的次数
    dangerousCount: number       // 危险建议的次数
  }
  
  // 问题洞察类型分析
  insightTypePerformance: Record<string, {
    count: number
    avgAccuracy: number
    avgActionability: number
  }>
  
  // 结论
  conclusion: {
    passed: boolean              // 平均分 ≥ 3.5 且无红线违规
    grade: "A" | "B" | "C" | "D" | "F"
    criticalIssues: string[]
    recommendations: string[]
  }
}

export function analyzeAIEvaluations(
  evaluations: CoachAIEvaluation[]
): AIEvaluationReport {
  const allInsightScores = evaluations.flatMap(e => 
    e.insightEvaluation.map(ie => ie.scores)
  )
  
  if (allInsightScores.length === 0) {
    return {
      totalEvaluations: 0,
      totalInsights: 0,
      averages: { accuracy: 0, relevance: 0, actionability: 0, overall: 0 },
      distribution: { accuracy: {}, relevance: {}, actionability: {} },
      redLineViolations: { actionabilityLow: 0, nonsenseCount: 0, dangerousCount: 0 },
      insightTypePerformance: {},
      conclusion: {
        passed: false,
        grade: "F",
        criticalIssues: ["无评估数据"],
        recommendations: []
      }
    }
  }
  
  // 计算平均分
  const avgAccuracy = allInsightScores.reduce((s, x) => s + x.accuracy, 0) / allInsightScores.length
  const avgRelevance = allInsightScores.reduce((s, x) => s + x.relevance, 0) / allInsightScores.length
  const avgActionability = allInsightScores.reduce((s, x) => s + x.actionability, 0) / allInsightScores.length
  
  // 分布统计
  const distribution = {
    accuracy: countBy(allInsightScores.map(s => s.accuracy)),
    relevance: countBy(allInsightScores.map(s => s.relevance)),
    actionability: countBy(allInsightScores.map(s => s.actionability))
  }
  
  // 红线违规统计
  const actionabilityLow = allInsightScores.filter(s => s.actionability <= 2).length
  const nonsenseCount = evaluations.flatMap(e => e.insightEvaluation).filter(ie => ie.isNonsense).length
  const dangerousCount = evaluations.flatMap(e => e.insightEvaluation).filter(ie => ie.isDangerous).length
  
  // 评分等级
  const overall = (avgAccuracy + avgRelevance + avgActionability) / 3
  let grade: AIEvaluationReport["conclusion"]["grade"]
  let passed: boolean
  
  if (overall >= 4.0 && actionabilityLow === 0) {
    grade = "A"
    passed = true
  } else if (overall >= 3.5 && actionabilityLow <= 2) {
    grade = "B"
    passed = true
  } else if (overall >= 3.0) {
    grade = "C"
    passed = false
  } else if (overall >= 2.0) {
    grade = "D"
    passed = false
  } else {
    grade = "F"
    passed = false
  }
  
  // 关键问题
  const criticalIssues: string[] = []
  if (actionabilityLow > 0) {
    criticalIssues.push(`${actionabilityLow} 个洞察的可执行性 ≤ 2 分，需要立即修改`)
  }
  if (nonsenseCount > 0) {
    criticalIssues.push(`${nonsenseCount} 个洞察被判定为废话/胡说`)
  }
  if (dangerousCount > 0) {
    criticalIssues.push(`${dangerousCount} 个建议被认为有安全风险`)
  }
  if (avgAccuracy < 3.5) {
    criticalIssues.push("因果推理准确度不足，Prompt需要优化")
  }
  
  // 改进建议
  const recommendations: string[] = []
  if (avgActionability < 3.5) {
    recommendations.push("强化训练处方的可执行性，增加具体执行细节")
    recommendations.push("优化向量检索逻辑，确保处方与问题高度匹配")
  }
  if (avgAccuracy < 3.5) {
    recommendations.push("优化因果推理Prompt，要求更严格的证据链")
  }
  
  return {
    totalEvaluations: evaluations.length,
    totalInsights: allInsightScores.length,
    averages: {
      accuracy: Math.round(avgAccuracy * 10) / 10,
      relevance: Math.round(avgRelevance * 10) / 10,
      actionability: Math.round(avgActionability * 10) / 10,
      overall: Math.round(overall * 10) / 10
    },
    distribution,
    redLineViolations: {
      actionabilityLow,
      nonsenseCount,
      dangerousCount
    },
    insightTypePerformance: {}, // TODO: 按类型分组统计
    conclusion: {
      passed,
      grade,
      criticalIssues,
      recommendations
    }
  }
}

// ============ 盲测流程工具 ============

/**
 * 生成盲测表单
 * 将 AI 洞察匿名化后给教练评估
 */
export function generateBlindAIEvaluationForm(
  aiInsights: AIInsightForEvaluation[],
  coachId: string,
  coachName: string
): {
  formId: string
  coachId: string
  coachName: string
  instructions: string
  evaluations: Array<{
    anonymousId: string
    insightTitle: string
    insightContent: string
    recommendation: string
    prescriptionNames: string[]
  }>
} {
  return {
    formId: `ai-blind-${Date.now()}`,
    coachId,
    coachName,
    instructions: `
【AI 洞察盲测说明】

你将看到一系列针对球员表现的分析和训练建议。
这些分析来自一个智能系统（你不需要知道是哪个）。

请基于你的执教经验，对每个分析进行评分。

评分维度（1-5分）：
1. 因果推理准确度：分析的原因是否准确？
2. 处方匹配精准度：推荐的训练是否真能解决问题？
3. 可执行性：明天训练能直接用吗？

⚠️ 重要：
- 盲测：不要猜测这是哪个系统
- 诚实：基于专业判断打分
- 红线：如果建议不可执行（≤2分），必须说明原因
    `.trim(),
    evaluations: aiInsights.map((insight, index) => ({
      anonymousId: `insight-${index + 1}`,
      insightTitle: insight.insights[0]?.title || "综合分析",
      insightContent: insight.insights.map(i => 
        `【${i.title}】\n${i.insight}\n证据：${i.evidence}\n建议：${i.recommendation}`
      ).join("\n\n"),
      recommendation: insight.insights.map(i => i.recommendation).join("；"),
      prescriptionNames: insight.prescriptions.map(p => p.matchedAction.name)
    }))
  }
}

// ============ 辅助函数 ============

function countBy<T>(array: T[]): Record<string, number> {
  return array.reduce((result, item) => {
    const key = String(item)
    result[key] = (result[key] || 0) + 1
    return result
  }, {} as Record<string, number>)
}

// ============ 导出报告 ============

export function exportAIEvaluationReport(report: AIEvaluationReport): string {
  const lines: string[] = []
  
  lines.push("# AI 分析师评估报告")
  lines.push(``)
  lines.push(`生成时间: ${new Date().toLocaleString("zh-CN")}`)
  lines.push(`评估样本: ${report.totalInsights} 条洞察 (来自 ${report.totalEvaluations} 位教练)`)
  lines.push(``)
  
  lines.push("## 1. 综合评分")
  lines.push(``)
  lines.push(`**等级: ${report.conclusion.grade}**`)
  lines.push(`**结果: ${report.conclusion.passed ? "✅通过" : "❌未通过"}**`)
  lines.push(``)
  lines.push(`| 维度 | 平均分 | 评价 |`)
  lines.push(`|------|--------|------|`)
  lines.push(`| 因果推理准确度 | ${report.averages.accuracy} | ${getScoreLabel(report.averages.accuracy)} |`)
  lines.push(`| 处方匹配精准度 | ${report.averages.relevance} | ${getScoreLabel(report.averages.relevance)} |`)
  lines.push(`| 可执行性 | ${report.averages.actionability} | ${getScoreLabel(report.averages.actionability)} |`)
  lines.push(`| **综合** | **${report.averages.overall}** | **${getScoreLabel(report.averages.overall)}** |`)
  lines.push(``)
  
  lines.push("## 2. 红线违规统计")
  lines.push(``)
  lines.push(`- 可执行性 ≤ 2分: ${report.redLineViolations.actionabilityLow} 次`)
  lines.push(`- 废话/胡说: ${report.redLineViolations.nonsenseCount} 次`)
  lines.push(`- 危险建议: ${report.redLineViolations.dangerousCount} 次`)
  lines.push(``)
  
  if (report.redLineViolations.actionabilityLow > 0) {
    lines.push("⚠️ **警告：存在可执行性不达标的洞察，必须立即修改！**")
    lines.push(``)
  }
  
  lines.push("## 3. 关键问题")
  lines.push(``)
  report.conclusion.criticalIssues.forEach((issue, i) => {
    lines.push(`${i + 1}. ${issue}`)
  })
  lines.push(``)
  
  lines.push("## 4. 改进建议")
  lines.push(``)
  report.conclusion.recommendations.forEach((rec, i) => {
    lines.push(`${i + 1}. ${rec}`)
  })
  lines.push(``)
  
  lines.push("## 5. 评分分布")
  lines.push(``)
  lines.push("### 可执行性分布")
  lines.push(``)
  Object.entries(report.distribution.actionability).forEach(([score, count]) => {
    const bar = "█".repeat(count)
    lines.push(`${score}分: ${bar} (${count})`)
  })
  
  return lines.join("\n")
}

function getScoreLabel(score: number): string {
  if (score >= 4.5) return "优秀"
  if (score >= 3.5) return "良好"
  if (score >= 3.0) return "及格"
  if (score >= 2.0) return "较差"
  return "不合格"
}
