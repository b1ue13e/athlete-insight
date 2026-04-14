/**
 * 置信区间评分系统
 * 
 * 核心思想：数据质量决定评分的确定性。
 * 不要只给一个分数 "82"，而是给出 "78-86 (高置信度)"。
 * 这种统计学上的严谨性，拉开与"玩具级"数据分析的差距。
 */

import { DataSourceType } from "@/types/certainty"

// ============ 置信区间计算 ============

export interface ConfidenceInterval {
  lower: number        // 下限
  upper: number        // 上限
  point: number        // 点估计 (当前展示的单值)
  confidenceLevel: number // 置信水平 (0-100)
}

export interface ScoreWithConfidence {
  score: ConfidenceInterval
  quality: "high" | "medium" | "low" | "insufficient"
  sampleSizeNote: string
  recommendation: string
}

/**
 * 计算评分置信区间
 * 
 * @param pointScore 点估计分数 (0-100)
 * @param dataQualityScore 数据质量分 (0-100)
 * @param sampleSize 样本量 (比赛场次)
 * @param exactDataRatio 精确数据占比 (0-1)
 */
export function calculateScoreConfidenceInterval(
  pointScore: number,
  dataQualityScore: number,
  sampleSize: number = 1,
  exactDataRatio: number = 0.5
): ConfidenceInterval {
  // 基础标准差 (数据质量越高，标准差越小)
  const baseStdDev = 15
  const qualityFactor = 1 - (dataQualityScore / 100) * 0.5 // 0.5-1.0
  
  // 样本量因子 (样本越多，区间越窄)
  const sampleFactor = Math.sqrt(1 / Math.max(1, sampleSize))
  
  // 精确数据因子
  const exactFactor = 1 - exactDataRatio * 0.3 // 0.7-1.0
  
  // 计算标准误差
  const standardError = baseStdDev * qualityFactor * sampleFactor * exactFactor
  
  // 95% 置信区间的 Z 值 ≈ 1.96
  const zScore = 1.96
  const marginOfError = standardError * zScore
  
  // 置信水平 (数据质量决定)
  const confidenceLevel = Math.round(
    70 + (dataQualityScore / 100) * 25 + (exactDataRatio * 5)
  )
  
  return {
    lower: Math.max(0, Math.round(pointScore - marginOfError)),
    upper: Math.min(100, Math.round(pointScore + marginOfError)),
    point: Math.round(pointScore),
    confidenceLevel: Math.min(99, confidenceLevel),
  }
}

// ============ 多维度置信评估 ============

export interface MultiDimensionalConfidence {
  overall: ScoreWithConfidence
  dimensions: {
    scoring: ScoreWithConfidence
    errorControl: ScoreWithConfidence
    stability: ScoreWithConfidence
    clutch: ScoreWithConfidence
  }
  crossValidation: {
    consistent: boolean
    outliers: string[]
    note: string
  }
}

interface DimensionData {
  score: number
  dataQuality: number
  exactFields: number
  totalFields: number
}

export function calculateMultiDimensionalConfidence(
  dimensions: {
    scoring: DimensionData
    errorControl: DimensionData
    stability: DimensionData
    clutch: DimensionData
  },
  sampleSize: number = 1
): MultiDimensionalConfidence {
  const calcDimension = (data: DimensionData): ScoreWithConfidence => {
    const exactRatio = data.totalFields > 0 ? data.exactFields / data.totalFields : 0
    const interval = calculateScoreConfidenceInterval(
      data.score,
      data.dataQuality,
      sampleSize,
      exactRatio
    )
    
    let quality: "high" | "medium" | "low" | "insufficient"
    let sampleSizeNote: string
    let recommendation: string
    
    if (interval.confidenceLevel >= 85 && interval.upper - interval.lower <= 10) {
      quality = "high"
      sampleSizeNote = "数据充分，评分可信"
      recommendation = "基于当前数据制定训练计划"
    } else if (interval.confidenceLevel >= 70) {
      quality = "medium"
      sampleSizeNote = "数据基本充分，但存在不确定性"
      recommendation = "建议补充更多精确数据以提升评估准确性"
    } else if (interval.confidenceLevel >= 50) {
      quality = "low"
      sampleSizeNote = "数据不足，评分仅供参考"
      recommendation = "需要更多样本或更精确的统计数据"
    } else {
      quality = "insufficient"
      sampleSizeNote = "数据严重不足，无法做出可靠评估"
      recommendation = "强烈建议补充完整数据后再做评估"
    }
    
    return {
      score: interval,
      quality,
      sampleSizeNote,
      recommendation,
    }
  }
  
  const dimScores = {
    scoring: calcDimension(dimensions.scoring),
    errorControl: calcDimension(dimensions.errorControl),
    stability: calcDimension(dimensions.stability),
    clutch: calcDimension(dimensions.clutch),
  }
  
  // 计算总体置信度
  const overallScore = Math.round(
    (dimensions.scoring.score + dimensions.errorControl.score + 
     dimensions.stability.score + dimensions.clutch.score) / 4
  )
  const overallQuality = Math.round(
    (dimensions.scoring.dataQuality + dimensions.errorControl.dataQuality +
     dimensions.stability.dataQuality + dimensions.clutch.dataQuality) / 4
  )
  const overallExact = Math.round(
    (dimensions.scoring.exactFields + dimensions.errorControl.exactFields +
     dimensions.stability.exactFields + dimensions.clutch.exactFields) / 4
  )
  const overallTotal = Math.round(
    (dimensions.scoring.totalFields + dimensions.errorControl.totalFields +
     dimensions.stability.totalFields + dimensions.clutch.totalFields) / 4
  )
  
  const overallInterval = calculateScoreConfidenceInterval(
    overallScore,
    overallQuality,
    sampleSize,
    overallTotal > 0 ? overallExact / overallTotal : 0
  )
  
  // 交叉验证：检查各维度是否一致
  const scores = [
    dimensions.scoring.score,
    dimensions.errorControl.score,
    dimensions.stability.score,
    dimensions.clutch.score,
  ]
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  
  const outliers: string[] = []
  if (Math.abs(dimensions.scoring.score - mean) > stdDev * 1.5) outliers.push("得分贡献")
  if (Math.abs(dimensions.errorControl.score - mean) > stdDev * 1.5) outliers.push("失误控制")
  if (Math.abs(dimensions.stability.score - mean) > stdDev * 1.5) outliers.push("稳定性")
  if (Math.abs(dimensions.clutch.score - mean) > stdDev * 1.5) outliers.push("关键分")
  
  return {
    overall: {
      score: overallInterval,
      quality: overallInterval.confidenceLevel >= 85 ? "high" : 
               overallInterval.confidenceLevel >= 70 ? "medium" :
               overallInterval.confidenceLevel >= 50 ? "low" : "insufficient",
      sampleSizeNote: sampleSize >= 5 ? "基于足够样本量" : `基于${sampleSize}场比赛，建议积累至少5场数据`,
      recommendation: overallInterval.confidenceLevel >= 70 
        ? "当前数据可靠，可用于训练决策"
        : "建议继续收集数据以提升评估可靠性",
    },
    dimensions: dimScores,
    crossValidation: {
      consistent: outliers.length === 0,
      outliers,
      note: outliers.length > 0 
        ? `注意：${outliers.join("、")}维度与其他维度存在较大差异，建议复核`
        : "各维度评分一致性良好",
    },
  }
}

// ============ 展示格式化 ============

export function formatConfidenceInterval(
  interval: ConfidenceInterval,
  style: "full" | "short" | "range" = "full"
): string {
  switch (style) {
    case "full":
      return `${interval.point}分 (置信区间: ${interval.lower}-${interval.upper}, ${interval.confidenceLevel}%置信度)`
    case "short":
      return `${interval.point} [${interval.lower}-${interval.upper}]`
    case "range":
      return `${interval.lower}-${interval.upper}`
    default:
      return `${interval.point}`
  }
}

export function formatQualityBadge(quality: "high" | "medium" | "low" | "insufficient"): {
  text: string
  color: string
  bgColor: string
} {
  switch (quality) {
    case "high":
      return { text: "高置信度", color: "#22c55e", bgColor: "rgba(34, 197, 94, 0.1)" }
    case "medium":
      return { text: "中等置信度", color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)" }
    case "low":
      return { text: "低置信度", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" }
    case "insufficient":
      return { text: "数据不足", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" }
  }
}

// ============ 趋势置信度 ============

export interface TrendConfidence {
  hasSignificantTrend: boolean
  trendDirection: "improving" | "declining" | "stable" | "insufficient_data"
  confidence: number
  note: string
  requiredSampleSize: number
}

/**
 * 评估趋势统计显著性
 */
export function assessTrendConfidence(
  scores: number[],
  dates: string[]
): TrendConfidence {
  const n = scores.length
  
  if (n < 3) {
    return {
      hasSignificantTrend: false,
      trendDirection: "insufficient_data",
      confidence: 0,
      note: "至少需要3场比赛数据才能判断趋势",
      requiredSampleSize: 3,
    }
  }
  
  // 简单线性回归计算趋势
  const x = Array.from({ length: n }, (_, i) => i)
  const y = scores
  
  const xMean = x.reduce((a, b) => a + b, 0) / n
  const yMean = y.reduce((a, b) => a + b, 0) / n
  
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean)
    denominator += Math.pow(x[i] - xMean, 2)
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0
  
  // 计算 R²
  const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (yMean + slope * (x[i] - xMean)), 2), 0)
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0
  
  // 判断趋势方向
  let trendDirection: "improving" | "declining" | "stable" | "insufficient_data"
  if (Math.abs(slope) < 1) {
    trendDirection = "stable"
  } else if (slope > 0) {
    trendDirection = "improving"
  } else {
    trendDirection = "declining"
  }
  
  // 置信度基于 R² 和样本量
  const confidence = Math.round(rSquared * 100 * Math.min(1, n / 8))
  
  // 统计显著性阈值
  const hasSignificantTrend = Math.abs(slope) > 1.5 && rSquared > 0.3 && n >= 5
  
  let note: string
  if (n < 5) {
    note = `基于${n}场数据，趋势判断仅供参考，建议积累至少5场数据`
  } else if (!hasSignificantTrend) {
    note = "趋势不够显著，可能属于正常波动范围"
  } else if (rSquared > 0.6) {
    note = "趋势显著，可信度较高"
  } else {
    note = "存在一定趋势，但仍受其他因素影响"
  }
  
  return {
    hasSignificantTrend,
    trendDirection,
    confidence,
    note,
    requiredSampleSize: 5,
  }
}
