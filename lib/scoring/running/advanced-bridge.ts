import { analyzeRunningAdvancedInsights, hasAdvancedInsightsData } from "./advanced"
import { buildDisplayableAdvancedInsights } from "./advanced/adapter"
import type { RunningScoreReport, RunningSessionInput } from "./schemas"

export function hasAdvancedData(input: RunningSessionInput) {
  return hasAdvancedInsightsData(input)
}

export function runAdvancedAnalysis(input: RunningSessionInput) {
  return analyzeRunningAdvancedInsights(input)
}

export function generateComparisonInsight(report: RunningScoreReport, input: RunningSessionInput) {
  const advanced = buildDisplayableAdvancedInsights(analyzeRunningAdvancedInsights(input))
  if (advanced.length === 0) {
    return "当前没有足够高级数据，因此主结论完全按规则评分输出。"
  }

  if (report.scoreBreakdown.loadQuality.score < 70) {
    return "主评分已经判断负荷落点偏差，高级洞察只用于解释这种偏差是如何在时序数据里体现出来的。"
  }

  return "高级洞察与主评分分层展示：主评分判断练没练对，高级洞察解释可能的生理或动作信号。"
}
