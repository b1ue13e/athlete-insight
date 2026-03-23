/**
 * Scoring Engine - 可信的排球分析评分系统 v2.0
 * 
 * 核心设计：
 * 1. 总分 = 4个子维度的加权平均
 * 2. 每个子维度有明确的度量和解释逻辑
 * 3. 不同位置有不同的权重模板
 * 4. 数据完整度影响置信度
 * 5. 缺失数据时降低对应维度权重
 * 6. 所有计算可解释、可追溯
 */

import { VolleyballFormData, VolleyballPosition } from "@/types"
import { 
  CURRENT_SCORING_VERSION, 
  versionToString,
  generateScoringMetadata,
  createDebugInfoContainer,
  ScoringDebugInfo
} from "./scoring-version"

// ============ 位置权重模板 ============

interface PositionWeights {
  name: string
  description: string
  overall: {
    scoring_contribution: number
    error_control: number
    stability: number
    clutch_performance: number
  }
  metrics: {
    scoring: {
      attack_kills_weight: number
      serve_aces_weight: number
      block_points_weight: number
      digs_weight: number
    }
    error_control: {
      serve_errors_weight: number
      attack_errors_weight: number
      blocked_times_weight: number
    }
    stability: {
      reception_weight: number
      error_density_weight: number
    }
    clutch: {
      clutch_score_weight: number
      point_ratio_weight: number
    }
  }
  // 关键字段（缺失时会影响该维度权重）
  criticalFields: {
    scoring: string[]
    error_control: string[]
    stability: string[]
    clutch: string[]
  }
}

const positionTemplates: Record<VolleyballPosition, PositionWeights> = {
  "主攻": {
    name: "主攻",
    description: "球队主要得分手，进攻权重最高，一传要求适中",
    overall: {
      scoring_contribution: 0.40,
      error_control: 0.25,
      stability: 0.20,
      clutch_performance: 0.15,
    },
    metrics: {
      scoring: {
        attack_kills_weight: 0.70,
        serve_aces_weight: 0.15,
        block_points_weight: 0.10,
        digs_weight: 0.05,
      },
      error_control: {
        serve_errors_weight: 0.30,
        attack_errors_weight: 0.50,
        blocked_times_weight: 0.20,
      },
      stability: {
        reception_weight: 0.40,
        error_density_weight: 0.60,
      },
      clutch: {
        clutch_score_weight: 0.70,
        point_ratio_weight: 0.30,
      },
    },
    criticalFields: {
      scoring: ["attack_kills", "attack_errors", "blocked_times"],
      error_control: ["serve_errors", "attack_errors", "blocked_times"],
      stability: ["reception_success_rate"],
      clutch: ["clutch_performance_score"],
    },
  },
  "接应": {
    name: "接应",
    description: "辅助得分手，进攻和稳定性并重",
    overall: {
      scoring_contribution: 0.35,
      error_control: 0.25,
      stability: 0.25,
      clutch_performance: 0.15,
    },
    metrics: {
      scoring: {
        attack_kills_weight: 0.65,
        serve_aces_weight: 0.20,
        block_points_weight: 0.10,
        digs_weight: 0.05,
      },
      error_control: {
        serve_errors_weight: 0.35,
        attack_errors_weight: 0.45,
        blocked_times_weight: 0.20,
      },
      stability: {
        reception_weight: 0.50,
        error_density_weight: 0.50,
      },
      clutch: {
        clutch_score_weight: 0.60,
        point_ratio_weight: 0.40,
      },
    },
    criticalFields: {
      scoring: ["attack_kills", "attack_errors"],
      error_control: ["attack_errors", "serve_errors"],
      stability: ["reception_success_rate"],
      clutch: ["clutch_performance_score"],
    },
  },
  "副攻": {
    name: "副攻",
    description: "网口核心，拦网和快攻为主",
    overall: {
      scoring_contribution: 0.30,
      error_control: 0.30,
      stability: 0.25,
      clutch_performance: 0.15,
    },
    metrics: {
      scoring: {
        attack_kills_weight: 0.50,
        serve_aces_weight: 0.10,
        block_points_weight: 0.35,
        digs_weight: 0.05,
      },
      error_control: {
        serve_errors_weight: 0.40,
        attack_errors_weight: 0.40,
        blocked_times_weight: 0.20,
      },
      stability: {
        reception_weight: 0.30,
        error_density_weight: 0.70,
      },
      clutch: {
        clutch_score_weight: 0.60,
        point_ratio_weight: 0.40,
      },
    },
    criticalFields: {
      scoring: ["attack_kills", "block_points"],
      error_control: ["attack_errors", "blocked_times"],
      stability: ["reception_success_rate"],
      clutch: ["clutch_performance_score"],
    },
  },
  "二传": {
    name: "二传",
    description: "球队大脑，稳定性要求最高，失误容忍度最低",
    overall: {
      scoring_contribution: 0.20,
      error_control: 0.35,
      stability: 0.30,
      clutch_performance: 0.15,
    },
    metrics: {
      scoring: {
        attack_kills_weight: 0.30,
        serve_aces_weight: 0.10,
        block_points_weight: 0.20,
        digs_weight: 0.40,
      },
      error_control: {
        serve_errors_weight: 0.40,
        attack_errors_weight: 0.30,
        blocked_times_weight: 0.30,
      },
      stability: {
        reception_weight: 0.60,
        error_density_weight: 0.40,
      },
      clutch: {
        clutch_score_weight: 0.65,
        point_ratio_weight: 0.35,
      },
    },
    criticalFields: {
      scoring: ["digs", "block_points"],
      error_control: ["serve_errors", "attack_errors"],
      stability: ["reception_success_rate"],
      clutch: ["clutch_performance_score"],
    },
  },
  "自由人": {
    name: "自由人",
    description: "防守核心，不参与进攻，专注一传和防守",
    overall: {
      scoring_contribution: 0.15,
      error_control: 0.30,
      stability: 0.40,
      clutch_performance: 0.15,
    },
    metrics: {
      scoring: {
        attack_kills_weight: 0,
        serve_aces_weight: 0,
        block_points_weight: 0,
        digs_weight: 1.0,
      },
      error_control: {
        serve_errors_weight: 0,
        attack_errors_weight: 0,
        blocked_times_weight: 1.0,
      },
      stability: {
        reception_weight: 0.80,
        error_density_weight: 0.20,
      },
      clutch: {
        clutch_score_weight: 0.70,
        point_ratio_weight: 0.30,
      },
    },
    criticalFields: {
      scoring: ["digs"],
      error_control: ["blocked_times"],
      stability: ["reception_success_rate"],
      clutch: ["clutch_performance_score"],
    },
  },
}

// ============ 数据完整度评估 ============

interface DataQualityAssessment {
  completeness: number
  missingCriticalFields: string[]
  lowConfidenceFields: string[]
  dimensionConfidence: {
    scoring: number
    error_control: number
    stability: number
    clutch: number
  }
}

function assessDataQuality(
  data: VolleyballFormData,
  weights: PositionWeights
): DataQualityAssessment {
  const requiredFields = [
    "total_points",
    "total_points_lost",
    "attack_kills",
    "attack_errors",
    "reception_success_rate",
    "clutch_performance_score",
  ]
  
  // 检查字段填充情况
  const filledFields = requiredFields.filter(field => {
    const value = data[field as keyof VolleyballFormData]
    return value !== undefined && value !== null && value !== 0
  })
  
  const completeness = filledFields.length / requiredFields.length
  
  // 检查各维度的关键字段
  const missingCriticalFields: string[] = []
  const dimensionConfidence = {
    scoring: 1.0,
    error_control: 1.0,
    stability: 1.0,
    clutch: 1.0,
  }
  
  for (const [dimension, fields] of Object.entries(weights.criticalFields)) {
    const missingFields = fields.filter(field => {
      const value = data[field as keyof VolleyballFormData]
      return value === undefined || value === null || value === 0
    })
    
    if (missingFields.length > 0) {
      missingCriticalFields.push(...missingFields)
      // 关键字段缺失会降低该维度置信度
      dimensionConfidence[dimension as keyof typeof dimensionConfidence] = Math.max(
        0.3,
        1 - (missingFields.length / fields.length) * 0.7
      )
    }
  }
  
  // 检查低置信度字段（有值但可能不可靠）
  const lowConfidenceFields: string[] = []
  if (data.clutch_performance_score === 60) {
    lowConfidenceFields.push("clutch_performance_score") // 可能是默认值
  }
  if (data.reception_success_rate === 60) {
    lowConfidenceFields.push("reception_success_rate") // 可能是默认值
  }
  
  return {
    completeness,
    missingCriticalFields: Array.from(new Set(missingCriticalFields)),
    lowConfidenceFields,
    dimensionConfidence,
  }
}

// ============ 子评分计算 ============

export interface SubScores {
  [key: string]: number
  scoring_contribution: number
  error_control: number
  stability: number
  clutch_performance: number
}

export interface ScoringDetails {
  sub_scores: SubScores
  overall_score: number
  confidence_score: number  // 新增：置信度分数
  weights_used: PositionWeights
  data_quality: DataQualityAssessment
  calculations: {
    scoring: {
      attack_efficiency: number
      serve_efficiency: number
      block_impact: number
      defense_impact: number
      raw_score: number
    }
    error_control: {
      serve_error_rate: number
      attack_error_rate: number
      blocked_rate: number
      raw_score: number
    }
    stability: {
      reception_normalized: number
      error_density_normalized: number
      raw_score: number
    }
    clutch: {
      clutch_normalized: number
      point_ratio_normalized: number
      raw_score: number
    }
  }
  debug_info?: ScoringDebugInfo
}

// ... (保留原有的 calculateScoringContribution, calculateErrorControl, calculateStability, calculateClutchPerformance 函数)
// 这些函数保持不变，但在调用时会考虑数据质量

// 为简洁起见，这里只展示修改后的主入口函数

// [前面的四个计算函数保持不变，省略以节省空间]
function calculateScoringContribution(
  data: VolleyballFormData,
  weights: PositionWeights["metrics"]["scoring"]
): { score: number; details: ScoringDetails["calculations"]["scoring"] } {
  const estimatedServes = Math.max(10, data.total_points / 3)
  const attackAttempts = data.attack_kills + data.attack_errors + data.blocked_times
  
  const attackEfficiency = attackAttempts > 0 
    ? (data.attack_kills / attackAttempts) * 100 
    : 0
  
  const serveEfficiency = estimatedServes > 0
    ? (data.serve_aces / estimatedServes) * 100
    : 0
  
  const estimatedSets = Math.max(3, (data.total_points + data.total_points_lost) / 25)
  const blockImpact = Math.min(100, (data.block_points / estimatedSets) * 20)
  
  const defenseImpact = Math.min(100, (data.digs / estimatedSets) * 10)
  
  const rawScore = 
    attackEfficiency * weights.attack_kills_weight +
    serveEfficiency * weights.serve_aces_weight +
    blockImpact * weights.block_points_weight +
    defenseImpact * weights.digs_weight
  
  const score = Math.min(100, Math.max(0, rawScore * 1.2))
  
  return {
    score: Math.round(score),
    details: {
      attack_efficiency: Math.round(attackEfficiency),
      serve_efficiency: Math.round(serveEfficiency),
      block_impact: Math.round(blockImpact),
      defense_impact: Math.round(defenseImpact),
      raw_score: Math.round(rawScore),
    },
  }
}

function calculateErrorControl(
  data: VolleyballFormData,
  weights: PositionWeights["metrics"]["error_control"]
): { score: number; details: ScoringDetails["calculations"]["error_control"] } {
  const estimatedServes = Math.max(10, data.total_points / 3)
  const attackAttempts = data.attack_kills + data.attack_errors + data.blocked_times
  
  const serveErrorRate = estimatedServes > 0
    ? Math.min(100, (data.serve_errors / estimatedServes) * 100)
    : 0
  
  const attackErrorRate = attackAttempts > 0
    ? Math.min(100, (data.attack_errors / attackAttempts) * 100)
    : 0
  
  const blockedRate = attackAttempts > 0
    ? Math.min(100, (data.blocked_times / attackAttempts) * 100)
    : 0
  
  const weightedErrorRate = 
    serveErrorRate * weights.serve_errors_weight +
    attackErrorRate * weights.attack_errors_weight +
    blockedRate * weights.blocked_times_weight
  
  const rawScore = 100 - weightedErrorRate * 1.5
  const score = Math.max(0, rawScore)
  
  return {
    score: Math.round(score),
    details: {
      serve_error_rate: Math.round(serveErrorRate),
      attack_error_rate: Math.round(attackErrorRate),
      blocked_rate: Math.round(blockedRate),
      raw_score: Math.round(score),
    },
  }
}

function calculateStability(
  data: VolleyballFormData,
  weights: PositionWeights["metrics"]["stability"]
): { score: number; details: ScoringDetails["calculations"]["stability"] } {
  const receptionNormalized = data.reception_success_rate
  
  const estimatedSets = Math.max(3, (data.total_points + data.total_points_lost) / 25)
  const totalErrors = data.serve_errors + data.attack_errors + data.blocked_times
  const errorsPerSet = totalErrors / estimatedSets
  
  const errorDensityNormalized = Math.max(0, 100 - (errorsPerSet - 1) * 25)
  
  const score = 
    receptionNormalized * weights.reception_weight +
    errorDensityNormalized * weights.error_density_weight
  
  return {
    score: Math.round(score),
    details: {
      reception_normalized: Math.round(receptionNormalized),
      error_density_normalized: Math.round(errorDensityNormalized),
      raw_score: Math.round(score),
    },
  }
}

function calculateClutchPerformance(
  data: VolleyballFormData,
  weights: PositionWeights["metrics"]["clutch"]
): { score: number; details: ScoringDetails["calculations"]["clutch"] } {
  const clutchNormalized = data.clutch_performance_score
  
  const pointRatio = data.total_points_lost > 0
    ? data.total_points / data.total_points_lost
    : data.total_points
  
  const pointRatioNormalized = Math.min(100, Math.max(0, (pointRatio - 0.5) * 40))
  
  const score = 
    clutchNormalized * weights.clutch_score_weight +
    pointRatioNormalized * weights.point_ratio_weight
  
  return {
    score: Math.round(score),
    details: {
      clutch_normalized: Math.round(clutchNormalized),
      point_ratio_normalized: Math.round(pointRatioNormalized),
      raw_score: Math.round(score),
    },
  }
}

// ============ 主入口（更新版） ============

export function calculateVolleyballScore(
  data: VolleyballFormData,
  options?: { includeDebug?: boolean }
): ScoringDetails {
  const weights = positionTemplates[data.player_position] || positionTemplates["主攻"]
  
  // 评估数据质量
  const dataQuality = assessDataQuality(data, weights)
  
  // 创建调试容器
  const { debugInfo, addStep } = createDebugInfoContainer()
  if (options?.includeDebug) {
    debugInfo.positionWeights = {
      position: weights.name,
      overallWeights: weights.overall,
      metricWeights: weights.metrics as unknown as Record<string, Record<string, number>>,
    }
    debugInfo.dataQuality = {
      completeness: dataQuality.completeness,
      missingFields: dataQuality.missingCriticalFields,
      lowConfidenceFields: dataQuality.lowConfidenceFields,
    }
  }
  
  // 计算4个子评分
  const scoringResult = calculateScoringContribution(data, weights.metrics.scoring)
  const errorControlResult = calculateErrorControl(data, weights.metrics.error_control)
  const stabilityResult = calculateStability(data, weights.metrics.stability)
  const clutchResult = calculateClutchPerformance(data, weights.metrics.clutch)
  
  if (options?.includeDebug) {
    addStep("scoring_contribution_calculation", data, scoringResult, "weighted_average")
    addStep("error_control_calculation", data, errorControlResult, "100 - weighted_error_rate * 1.5")
    addStep("stability_calculation", data, stabilityResult, "reception * weight + error_density * weight")
    addStep("clutch_calculation", data, clutchResult, "clutch_score * weight + point_ratio * weight")
  }
  
  // 应用数据质量调整
  const adjustedSubScores: SubScores = {
    scoring_contribution: Math.round(scoringResult.score * dataQuality.dimensionConfidence.scoring),
    error_control: Math.round(errorControlResult.score * dataQuality.dimensionConfidence.error_control),
    stability: Math.round(stabilityResult.score * dataQuality.dimensionConfidence.stability),
    clutch_performance: Math.round(clutchResult.score * dataQuality.dimensionConfidence.clutch),
  }
  
  // 根据数据质量调整权重
  let adjustedOverallWeights = { ...weights.overall }
  const totalConfidence = Object.values(dataQuality.dimensionConfidence).reduce((a, b) => a + b, 0)
  
  for (const [dim, confidence] of Object.entries(dataQuality.dimensionConfidence)) {
    if (confidence < 0.5) {
      // 置信度低的维度，权重重新分配给其他维度
      const weightReduction = adjustedOverallWeights[dim as keyof typeof adjustedOverallWeights] * (0.5 - confidence)
      adjustedOverallWeights[dim as keyof typeof adjustedOverallWeights] -= weightReduction
      
      // 把权重分配给高置信度维度
      const highConfDims = Object.entries(dataQuality.dimensionConfidence)
        .filter(([_, c]) => c >= 0.7)
        .map(([d, _]) => d)
      
      if (highConfDims.length > 0) {
        const bonusPerDim = weightReduction / highConfDims.length
        for (const highDim of highConfDims) {
          adjustedOverallWeights[highDim as keyof typeof adjustedOverallWeights] += bonusPerDim
        }
      }
    }
  }
  
  // 归一化权重
  const weightSum = Object.values(adjustedOverallWeights).reduce((a, b) => a + b, 0)
  for (const key of Object.keys(adjustedOverallWeights)) {
    adjustedOverallWeights[key as keyof typeof adjustedOverallWeights] /= weightSum
  }
  
  // 计算总分
  const overallScore = Math.round(
    adjustedSubScores.scoring_contribution * adjustedOverallWeights.scoring_contribution +
    adjustedSubScores.error_control * adjustedOverallWeights.error_control +
    adjustedSubScores.stability * adjustedOverallWeights.stability +
    adjustedSubScores.clutch_performance * adjustedOverallWeights.clutch_performance
  )
  
  // 计算整体置信度分数 (0-100)
  const confidenceScore = Math.round(
    (dataQuality.completeness * 0.4 + 
     Object.values(dataQuality.dimensionConfidence).reduce((a, b) => a + b, 0) / 4 * 0.6) * 100
  )
  
  if (options?.includeDebug) {
    addStep("final_calculation", 
      { raw_scores: { scoringResult, errorControlResult, stabilityResult, clutchResult } },
      { adjustedSubScores, overallScore, confidenceScore },
      "weighted_average_with_quality_adjustment"
    )
    debugInfo.intermediateScores = adjustedSubScores
  }
  
  return {
    sub_scores: adjustedSubScores,
    overall_score: overallScore,
    confidence_score: confidenceScore,
    weights_used: weights,
    data_quality: dataQuality,
    calculations: {
      scoring: scoringResult.details,
      error_control: errorControlResult.details,
      stability: stabilityResult.details,
      clutch: clutchResult.details,
    },
    debug_info: options?.includeDebug ? debugInfo : undefined,
  }
}

// 导出位置模板供外部使用
export { positionTemplates }
