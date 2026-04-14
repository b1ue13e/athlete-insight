/**
 * 影子测试系统 (Shadow Testing)
 * 
 * 核心原则：永远不要直接覆盖旧版引擎
 * 每次计算同时运行 v1 和 v2，存储双版本结果用于对比验证
 */

import { VolleyballFormData, VolleyballPosition, SubScores } from "@/types"
import { calculateVolleyballScore as calculateV1 } from "./scoring-engine"
import { calculateVolleyballScoreV2 } from "./scoring-engine-v2"

// ============ 影子评分结果 ============

export interface ShadowScoreResult {
  sessionId: string
  timestamp: string
  
  // 输入数据
  input: {
    raw: VolleyballFormData
    position: VolleyballPosition
    dataQualityScore: number
    exactDataRatio: number
  }
  
  // V1 引擎结果 (当前生产环境)
  v1: {
    overallScore: number
    subScores: SubScores
    confidenceScore: number
    calculationTimeMs: number
  }
  
  // V2 引擎结果 (待验证)
  v2: {
    overallScore: number
    subScores: SubScores
    confidenceInterval: {
      lower: number
      upper: number
      confidenceLevel: number
    }
    xpAdjustment: {
      rawScore: number
      adjustedScore: number
      explanation: string
    }
    bayesianEstimate: {
      posteriorMean: number
      driftDetected: boolean
    }
    calculationTimeMs: number
  }
  
  // 差异分析
  diff: {
    overallDelta: number        // V2 - V1
    subScoreDeltas: Partial<SubScores>
    rankConsistency: number     // 若有多人同场比赛
  }
  
  // 元数据
  metadata: {
    version: "shadow-v1-v2"
    environment: "staging" | "production"
    notes?: string
  }
}

// ============ 影子评分引擎 ============

export async function shadowCalculate(
  data: VolleyballFormData,
  options?: {
    sessionId?: string
    environment?: "staging" | "production"
    history?: any[]  // 用于贝叶斯更新
  }
): Promise<ShadowScoreResult> {
  const sessionId = options?.sessionId || generateSessionId()
  const startTime = Date.now()
  
  // 并行计算 V1 和 V2
  const [v1Result, v2Result] = await Promise.all([
    calculateV1Wrapper(data),
    calculateV2Wrapper(data, options?.history)
  ])
  
  const calculationTime = Date.now() - startTime
  
  // 计算差异
  const diff = calculateDiff(v1Result, v2Result)
  
  return {
    sessionId,
    timestamp: new Date().toISOString(),
    input: {
      raw: data,
      position: data.player_position,
      dataQualityScore: v1Result.confidence_score,
      exactDataRatio: estimateExactDataRatio(data)
    },
    v1: {
      overallScore: v1Result.overall_score,
      subScores: v1Result.sub_scores,
      confidenceScore: v1Result.confidence_score,
      calculationTimeMs: calculationTime / 2  // 估算
    },
    v2: {
      overallScore: v2Result.overall_score,
      subScores: v2Result.sub_scores,
      confidenceInterval: v2Result.confidence_interval,
      xpAdjustment: v2Result.xp_adjustment,
      bayesianEstimate: v2Result.bayesian_estimate,
      calculationTimeMs: calculationTime / 2
    },
    diff,
    metadata: {
      version: "shadow-v1-v2",
      environment: options?.environment || "staging"
    }
  }
}

// V1 包装器
async function calculateV1Wrapper(data: VolleyballFormData) {
  return calculateV1(data, { includeDebug: true })
}

// V2 包装器 (需要实现)
async function calculateV2Wrapper(data: VolleyballFormData, history?: any[]) {
  // 调用 lib/scoring-engine-v2.ts 中的函数
  const { calculateVolleyballScoreV2 } = await import("./scoring-engine-v2")
  return calculateVolleyballScoreV2(data, { history })
}

// 计算差异
function calculateDiff(v1: any, v2: any) {
  const overallDelta = v2.overall_score - v1.overall_score
  
  const subScoreDeltas: Partial<SubScores> = {
    scoring_contribution: v2.sub_scores.scoring_contribution - v1.sub_scores.scoring_contribution,
    error_control: v2.sub_scores.error_control - v1.sub_scores.error_control,
    stability: v2.sub_scores.stability - v1.sub_scores.stability,
    clutch_performance: v2.sub_scores.clutch_performance - v1.sub_scores.clutch_performance,
  }
  
  return {
    overallDelta: Math.round(overallDelta * 10) / 10,
    subScoreDeltas,
    rankConsistency: 0  // 需要多人数据才能计算
  }
}

// 估算精确数据比例
function estimateExactDataRatio(data: VolleyballFormData): number {
  const exactFields = [
    data.total_points,
    data.attack_kills,
    data.attack_errors,
    data.serve_aces,
    data.serve_errors,
  ].filter(v => v !== undefined && v !== null && v !== 0).length
  
  return exactFields / 5
}

function generateSessionId(): string {
  return `shadow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============ 影子数据存储 ============

const SHADOW_STORAGE_KEY = "athlete_insight_shadow_scores"

export function saveShadowResult(result: ShadowScoreResult): void {
  if (typeof window === "undefined") return
  
  const existing = JSON.parse(localStorage.getItem(SHADOW_STORAGE_KEY) || "[]")
  existing.push(result)
  localStorage.setItem(SHADOW_STORAGE_KEY, JSON.stringify(existing))
}

export function getAllShadowResults(): ShadowScoreResult[] {
  if (typeof window === "undefined") return []
  return JSON.parse(localStorage.getItem(SHADOW_STORAGE_KEY) || "[]")
}

export function exportShadowData(): string {
  const data = getAllShadowResults()
  return JSON.stringify(data, null, 2)
}

export function clearShadowData(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SHADOW_STORAGE_KEY)
}

// ============ 差异分析工具 ============

export interface ShadowAnalysis {
  totalComparisons: number
  avgOverallDelta: number
  scoreDistribution: {
    v1Higher: number
    v2Higher: number
    equal: number
  }
  largeDiffCases: ShadowScoreResult[]  // 差异 > 10 分的案例
}

export function analyzeShadowResults(): ShadowAnalysis {
  const results = getAllShadowResults()
  
  if (results.length === 0) {
    return {
      totalComparisons: 0,
      avgOverallDelta: 0,
      scoreDistribution: { v1Higher: 0, v2Higher: 0, equal: 0 },
      largeDiffCases: []
    }
  }
  
  const totalDelta = results.reduce((sum, r) => sum + r.diff.overallDelta, 0)
  
  const distribution = {
    v1Higher: results.filter(r => r.diff.overallDelta < -2).length,
    v2Higher: results.filter(r => r.diff.overallDelta > 2).length,
    equal: results.filter(r => Math.abs(r.diff.overallDelta) <= 2).length,
  }
  
  const largeDiffCases = results.filter(r => Math.abs(r.diff.overallDelta) > 10)
  
  return {
    totalComparisons: results.length,
    avgOverallDelta: Math.round((totalDelta / results.length) * 10) / 10,
    scoreDistribution: distribution,
    largeDiffCases
  }
}
