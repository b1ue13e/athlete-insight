/**
 * 评分引擎 V2.0 (待验证版本)
 * 
 * 集成：xP期望得分 + 置信区间 + 贝叶斯更新
 * 
 * ⚠️ 警告：此引擎正在影子测试阶段，请勿直接用于生产环境
 */

import { VolleyballFormData, SubScores } from "@/types"
import { calculateVolleyballScore as calculateV1 } from "./scoring-engine"
import { calculateScoreConfidenceInterval } from "./confidence-interval"
import { calculateMatchXP, applyXPAdjustment, MatchXPAnalysis } from "./xp-model"
import { initializePlayerProfile, updatePlayerProfile, PlayerAbilityProfile, BayesianAbilityEstimate } from "./bayesian-baseline"

export interface V2ScoringResult {
  overall_score: number
  sub_scores: SubScores
  confidence_interval: {
    lower: number
    upper: number
    point: number
    confidenceLevel: number
  }
  xp_adjustment: {
    rawScore: number
    adjustedScore: number
    adjustmentFactor: number
    explanation: string
  }
  bayesian_estimate: {
    posteriorMean: number
    driftDetected: boolean
    driftMagnitude: number
  }
  debug_info: {
    v1_raw_score: number
    xp_analysis?: MatchXPAnalysis
    data_quality_score: number
  }
}

export function calculateVolleyballScoreV2(
  data: VolleyballFormData,
  options?: {
    history?: any[]
    includeDebug?: boolean
  }
): V2ScoringResult {
  // 步骤1: 获取 V1 基础评分
  const v1Result = calculateV1(data, { includeDebug: true })
  const baseScore = v1Result.overall_score
  const baseSubScores = v1Result.sub_scores
  
  // 步骤2: xP 调整 (如果有事件数据)
  let xpAdjusted = {
    rawScore: baseScore,
    xpAdjustedScore: baseScore,
    adjustmentFactor: 1,
    explanation: "无xP数据"
  }
  let xpAnalysis: MatchXPAnalysis | undefined
  
  // TODO: 从 data 中提取比赛事件进行 xP 计算
  // 暂时跳过，等事件数据结构确定
  
  // 步骤3: 置信区间计算
  const dataQualityScore = v1Result.confidence_score
  const exactDataRatio = estimateExactDataRatio(data)
  const sampleSize = options?.history?.length || 1
  
  const confidenceInterval = calculateScoreConfidenceInterval(
    xpAdjusted.xpAdjustedScore,
    dataQualityScore,
    sampleSize,
    exactDataRatio
  )
  
  // 步骤4: 贝叶斯更新
  let bayesianEstimate: {
    posteriorMean: number
    driftDetected: boolean
    driftMagnitude: number
  } = {
    posteriorMean: xpAdjusted.xpAdjustedScore,
    driftDetected: false,
    driftMagnitude: 0
  }
  
  if (options?.history && options.history.length > 0) {
    // 从历史中提取该球员的能力画像
    const profile = initializePlayerProfile(
      data.match_name,  // 用比赛名作为临时ID
      baseSubScores
    )
    
    // 模拟更新
    const updated = updatePlayerProfile(profile, {
      score: baseScore,
      date: data.session_date,
      scores: baseSubScores,
      dataQuality: dataQualityScore,
      sampleSize: 20  // 假设的进攻次数
    })
    
    bayesianEstimate = {
      posteriorMean: updated.overall.posteriorMean,
      driftDetected: updated.overall.driftDetected,
      driftMagnitude: updated.overall.driftMagnitude
    }
  }
  
  // 最终评分：使用贝叶斯后验均值
  const finalScore = Math.round(bayesianEstimate.posteriorMean)
  
  return {
    overall_score: finalScore,
    sub_scores: baseSubScores,  // 保持子分数不变，只调整总分
    confidence_interval: confidenceInterval,
    xp_adjustment: {
      rawScore: xpAdjusted.rawScore,
      adjustedScore: xpAdjusted.xpAdjustedScore,
      adjustmentFactor: xpAdjusted.adjustmentFactor,
      explanation: xpAdjusted.explanation
    },
    bayesian_estimate: bayesianEstimate,
    debug_info: {
      v1_raw_score: baseScore,
      xp_analysis: xpAnalysis,
      data_quality_score: dataQualityScore
    }
  }
}

function estimateExactDataRatio(data: VolleyballFormData): number {
  const fields = [
    data.total_points,
    data.attack_kills,
    data.attack_errors,
    data.serve_aces,
    data.serve_errors,
    data.block_points,
    data.digs,
  ]
  const filled = fields.filter(v => v !== undefined && v !== null && v !== 0).length
  return filled / fields.length
}
