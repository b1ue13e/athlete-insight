/**
 * 贝叶斯个体基线更新系统
 * 
 * 核心思想：用贝叶斯更新思想动态计算球员真实能力。
 * 历史表现作为先验概率，本场比赛作为新证据，
 * 计算出能力均值是否发生实质性漂移，而非偶然起伏。
 */

import { SubScores } from "@/types"

// ============ 贝叶斯更新模型 ============

/**
 * 正态-正态共轭先验的贝叶斯更新
 * 
 * 假设球员真实能力服从正态分布 N(μ, σ²)
 * 先验：μ ~ N(μ₀, σ₀²) - 基于历史表现
 * 似然：x ~ N(μ, σ²)   - 本场比赛观测
 * 后验：μ ~ N(μ₁, σ₁²) - 更新后的能力估计
 */

export interface BayesianAbilityEstimate {
  priorMean: number           // 先验均值 (历史平均)
  priorStdDev: number         // 先验标准差
  likelihoodMean: number      // 似然均值 (本场得分)
  likelihoodStdDev: number    // 似然标准差 (基于数据质量)
  posteriorMean: number       // 后验均值 (更新后的能力估计)
  posteriorStdDev: number     // 后验标准差
  
  // 漂移检测
  driftDetected: boolean
  driftMagnitude: number      // 漂移幅度
  driftSignificance: number   // 显著性 (p值)
  
  // 不确定性
  credibleInterval: {
    lower: number
    upper: number
  }
  confidenceLevel: number
}

interface GameData {
  score: number
  date: string
  dataQuality: number       // 0-100，数据质量
  sampleSize: number        // 本场样本量 (如：进攻次数)
}

/**
 * 执行贝叶斯更新
 */
export function bayesianUpdate(
  priorMean: number,
  priorStdDev: number,
  observation: number,
  observationStdDev: number
): {
  posteriorMean: number
  posteriorStdDev: number
} {
  // 先验精度
  const priorPrecision = 1 / Math.pow(priorStdDev, 2)
  // 似然精度
  const likelihoodPrecision = 1 / Math.pow(observationStdDev, 2)
  
  // 后验精度 = 先验精度 + 似然精度
  const posteriorPrecision = priorPrecision + likelihoodPrecision
  
  // 后验方差
  const posteriorVariance = 1 / posteriorPrecision
  const posteriorStdDev = Math.sqrt(posteriorVariance)
  
  // 后验均值 = (先验精度*先验均值 + 似然精度*观测值) / 后验精度
  const posteriorMean = (priorPrecision * priorMean + likelihoodPrecision * observation) / posteriorPrecision
  
  return {
    posteriorMean: Math.round(posteriorMean * 10) / 10,
    posteriorStdDev: Math.round(posteriorStdDev * 10) / 10,
  }
}

/**
 * 计算能力漂移检测
 * 
 * 使用双样本t检验思想，判断本场表现是否代表能力漂移
 */
export function detectAbilityDrift(
  historicalScores: number[],
  currentScore: number,
  currentDataQuality: number
): {
  driftDetected: boolean
  driftMagnitude: number
  driftSignificance: number  // p值
  direction: "up" | "down" | "stable"
} {
  const n = historicalScores.length
  
  if (n < 3) {
    return {
      driftDetected: false,
      driftMagnitude: 0,
      driftSignificance: 1,
      direction: "stable",
    }
  }
  
  // 历史统计
  const historicalMean = historicalScores.reduce((a, b) => a + b, 0) / n
  const historicalVariance = historicalScores.reduce((sum, s) => sum + Math.pow(s - historicalMean, 2), 0) / n
  const historicalStdDev = Math.sqrt(historicalVariance)
  
  // 漂移幅度 (以标准差为单位)
  const driftMagnitude = (currentScore - historicalMean) / (historicalStdDev || 1)
  
  // 简化t检验计算
  // t = (current - historicalMean) / (historicalStdDev * sqrt(1 + 1/n))
  const standardError = historicalStdDev * Math.sqrt(1 + 1/n)
  const tStatistic = standardError > 0 ? (currentScore - historicalMean) / standardError : 0
  
  // 自由度
  const df = n - 1
  
  // 简化p值估计 (使用正态近似)
  const pValue = 2 * (1 - normalCDF(Math.abs(tStatistic)))
  
  // 显著性阈值 (α = 0.05)
  // 同时考虑数据质量，低质量数据需要更强的证据
  const qualityAdjustedAlpha = 0.05 * (1 + (100 - currentDataQuality) / 100)
  const driftDetected = pValue < qualityAdjustedAlpha && Math.abs(driftMagnitude) > 0.5
  
  let direction: "up" | "down" | "stable"
  if (driftDetected) {
    direction = driftMagnitude > 0 ? "up" : "down"
  } else {
    direction = "stable"
  }
  
  return {
    driftDetected,
    driftMagnitude: Math.round(driftMagnitude * 100) / 100,
    driftSignificance: Math.round(pValue * 1000) / 1000,
    direction,
  }
}

// 标准正态分布CDF
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  
  return 0.5 * (1 + sign * y)
}

// ============ 球员能力追踪器 ============

export interface PlayerAbilityProfile {
  playerId: string
  lastUpdated: string
  
  overall: BayesianAbilityEstimate
  dimensions: {
    scoring: BayesianAbilityEstimate
    errorControl: BayesianAbilityEstimate
    stability: BayesianAbilityEstimate
    clutch: BayesianAbilityEstimate
  }
  
  gameHistory: Array<{
    date: string
    scores: SubScores
    posteriorAfterGame: SubScores
  }>
  
  trend: {
    direction: "improving" | "declining" | "stable"
    velocity: number      // 变化速度
    confidence: number   // 趋势置信度
  }
}

/**
 * 初始化球员能力画像
 */
export function initializePlayerProfile(
  playerId: string,
  initialScores: SubScores,
  initialUncertainty: number = 10  // 初始不确定性
): PlayerAbilityProfile {
  const createInitialEstimate = (score: number): BayesianAbilityEstimate => ({
    priorMean: score,
    priorStdDev: initialUncertainty,
    likelihoodMean: score,
    likelihoodStdDev: initialUncertainty,
    posteriorMean: score,
    posteriorStdDev: initialUncertainty,
    driftDetected: false,
    driftMagnitude: 0,
    driftSignificance: 1,
    credibleInterval: {
      lower: Math.max(0, score - initialUncertainty * 2),
      upper: Math.min(100, score + initialUncertainty * 2),
    },
    confidenceLevel: 50, // 初始置信度较低
  })
  
  return {
    playerId,
    lastUpdated: new Date().toISOString(),
    overall: createInitialEstimate(
      (initialScores.scoring_contribution + initialScores.error_control + 
       initialScores.stability + initialScores.clutch_performance) / 4
    ),
    dimensions: {
      scoring: createInitialEstimate(initialScores.scoring_contribution),
      errorControl: createInitialEstimate(initialScores.error_control),
      stability: createInitialEstimate(initialScores.stability),
      clutch: createInitialEstimate(initialScores.clutch_performance),
    },
    gameHistory: [],
    trend: {
      direction: "stable",
      velocity: 0,
      confidence: 0,
    },
  }
}

/**
 * 更新球员能力画像
 */
export function updatePlayerProfile(
  profile: PlayerAbilityProfile,
  newGame: GameData & { scores: SubScores }
): PlayerAbilityProfile {
  const updateDimension = (
    current: BayesianAbilityEstimate,
    newScore: number,
    dataQuality: number
  ): BayesianAbilityEstimate => {
    // 观测标准差基于数据质量
    const observationStdDev = 15 * (1 + (100 - dataQuality) / 100)
    
    // 贝叶斯更新
    const { posteriorMean, posteriorStdDev } = bayesianUpdate(
      current.posteriorMean,
      current.posteriorStdDev,
      newScore,
      observationStdDev
    )
    
    // 漂移检测 (需要历史数据)
    const historicalScores = profile.gameHistory.map(g => {
      // 根据维度选择对应的分数
      if (current === profile.dimensions.scoring) return g.scores.scoring_contribution
      if (current === profile.dimensions.errorControl) return g.scores.error_control
      if (current === profile.dimensions.stability) return g.scores.stability
      return g.scores.clutch_performance
    })
    
    const drift = detectAbilityDrift(historicalScores, newScore, dataQuality)
    
    // 95% 可信区间
    const credibleInterval = {
      lower: Math.max(0, Math.round(posteriorMean - 1.96 * posteriorStdDev)),
      upper: Math.min(100, Math.round(posteriorMean + 1.96 * posteriorStdDev)),
    }
    
    // 置信水平 (随着数据积累而提高)
    const confidenceLevel = Math.min(95, 50 + profile.gameHistory.length * 5)
    
    return {
      priorMean: current.posteriorMean,
      priorStdDev: current.posteriorStdDev,
      likelihoodMean: newScore,
      likelihoodStdDev: observationStdDev,
      posteriorMean,
      posteriorStdDev,
      driftDetected: drift.driftDetected,
      driftMagnitude: drift.driftMagnitude,
      driftSignificance: drift.driftSignificance,
      credibleInterval,
      confidenceLevel,
    }
  }
  
  const updatedDimensions = {
    scoring: updateDimension(profile.dimensions.scoring, newGame.scores.scoring_contribution, newGame.dataQuality),
    errorControl: updateDimension(profile.dimensions.errorControl, newGame.scores.error_control, newGame.dataQuality),
    stability: updateDimension(profile.dimensions.stability, newGame.scores.stability, newGame.dataQuality),
    clutch: updateDimension(profile.dimensions.clutch, newGame.scores.clutch_performance, newGame.dataQuality),
  }
  
  // 更新总体能力
  const overallScore = (
    updatedDimensions.scoring.posteriorMean +
    updatedDimensions.errorControl.posteriorMean +
    updatedDimensions.stability.posteriorMean +
    updatedDimensions.clutch.posteriorMean
  ) / 4
  
  const overallStdDev = Math.sqrt(
    (Math.pow(updatedDimensions.scoring.posteriorStdDev, 2) +
     Math.pow(updatedDimensions.errorControl.posteriorStdDev, 2) +
     Math.pow(updatedDimensions.stability.posteriorStdDev, 2) +
     Math.pow(updatedDimensions.clutch.posteriorStdDev, 2)) / 4
  )
  
  // 更新历史记录
  const updatedHistory = [
    ...profile.gameHistory,
    {
      date: newGame.date,
      scores: newGame.scores,
      posteriorAfterGame: {
        scoring_contribution: updatedDimensions.scoring.posteriorMean,
        error_control: updatedDimensions.errorControl.posteriorMean,
        stability: updatedDimensions.stability.posteriorMean,
        clutch_performance: updatedDimensions.clutch.posteriorMean,
      },
    },
  ]
  
  // 计算趋势
  const recentScores = updatedHistory.slice(-5).map(h => 
    (h.scores.scoring_contribution + h.scores.error_control + 
     h.scores.stability + h.scores.clutch_performance) / 4
  )
  
  let trendDirection: "improving" | "declining" | "stable" = "stable"
  let trendVelocity = 0
  let trendConfidence = 0
  
  if (recentScores.length >= 3) {
    const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2))
    const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    
    trendVelocity = secondAvg - firstAvg
    
    if (Math.abs(trendVelocity) > 3) {
      trendDirection = trendVelocity > 0 ? "improving" : "declining"
    }
    
    trendConfidence = Math.min(90, recentScores.length * 15)
  }
  
  return {
    ...profile,
    lastUpdated: new Date().toISOString(),
    overall: {
      priorMean: profile.overall.posteriorMean,
      priorStdDev: profile.overall.posteriorStdDev,
      likelihoodMean: overallScore,
      likelihoodStdDev: overallStdDev,
      posteriorMean: Math.round(overallScore * 10) / 10,
      posteriorStdDev: Math.round(overallStdDev * 10) / 10,
      driftDetected: Object.values(updatedDimensions).some(d => d.driftDetected),
      driftMagnitude: Math.max(...Object.values(updatedDimensions).map(d => Math.abs(d.driftMagnitude))),
      driftSignificance: Math.min(...Object.values(updatedDimensions).map(d => d.driftSignificance)),
      credibleInterval: {
        lower: Math.max(0, Math.round(overallScore - 1.96 * overallStdDev)),
        upper: Math.min(100, Math.round(overallScore + 1.96 * overallStdDev)),
      },
      confidenceLevel: Math.min(95, 50 + updatedHistory.length * 5),
    },
    dimensions: updatedDimensions,
    gameHistory: updatedHistory,
    trend: {
      direction: trendDirection,
      velocity: Math.round(trendVelocity * 10) / 10,
      confidence: trendConfidence,
    },
  }
}

// ============ 报告生成辅助 ============

export function generateBayesianInsight(profile: PlayerAbilityProfile): string {
  const parts: string[] = []
  
  // 总体能力
  const overall = profile.overall
  parts.push(`当前能力评估: ${overall.posteriorMean.toFixed(1)}分 (可信区间: ${overall.credibleInterval.lower}-${overall.credibleInterval.upper})`)
  
  // 漂移检测
  if (overall.driftDetected) {
    const direction = overall.driftMagnitude > 0 ? "提升" : "下降"
    parts.push(`\n⚠️ 检测到能力${direction}：较历史基线漂移 ${Math.abs(overall.driftMagnitude).toFixed(1)} 个标准差`)
    parts.push(`统计显著性: p=${overall.driftSignificance.toFixed(3)} (显著的)`)
  } else {
    parts.push(`\n✓ 能力稳定：本场表现与历史水平一致`)
  }
  
  // 各维度
  parts.push("\n各维度后验估计:")
  Object.entries(profile.dimensions).forEach(([key, dim]) => {
    const names: Record<string, string> = {
      scoring: "得分贡献",
      errorControl: "失误控制",
      stability: "稳定性",
      clutch: "关键分",
    }
    const arrow = dim.driftDetected ? (dim.driftMagnitude > 0 ? "↑" : "↓") : "→"
    parts.push(`  ${names[key]}: ${dim.posteriorMean.toFixed(1)} ${arrow}`)
  })
  
  // 趋势
  if (profile.trend.confidence > 0) {
    const trendNames: Record<string, string> = {
      improving: "上升",
      declining: "下降",
      stable: "平稳",
    }
    parts.push(`\n近期趋势: ${trendNames[profile.trend.direction]} (置信度: ${profile.trend.confidence}%)`)
    if (Math.abs(profile.trend.velocity) > 0) {
      parts.push(`变化速度: ${profile.trend.velocity > 0 ? "+" : ""}${profile.trend.velocity.toFixed(1)} 分/场`)
    }
  }
  
  return parts.join("\n")
}
