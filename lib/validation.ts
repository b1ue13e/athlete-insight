/**
 * 核心算法统计学量化验证 (Quantitative Validation)
 * 
 * 验证目标：
 * 1. 斯皮尔曼等级相关系数 > 0.8 (评估xP模型)
 * 2. 置信区间覆盖率 > 80% @ 95%置信水平 (评估信心指数)
 * 3. AI洞察可执行性评分 > 3/5
 */

import { GoldStandardEntry } from "./gold-standard"

// ============ 1. 斯皮尔曼等级相关系数 ============

/**
 * 计算斯皮尔曼等级相关系数
 * 
 * 公式: ρ = 1 - (6 * Σd²) / (n(n² - 1))
 * 
 * d_i 是教练排名与系统排名的差
 * 
 * 目标: ρ > 0.8
 */

export interface SpearmanResult {
  coefficient: number      // 斯皮尔曼系数 ρ
  pValue: number          // p值，用于显著性检验
  n: number               // 样本量
  interpretation: string  // 解释
  passed: boolean         // 是否通过阈值 (ρ > 0.8)
}

export function calculateSpearmanCorrelation(
  coachRanks: number[],
  systemRanks: number[]
): SpearmanResult {
  if (coachRanks.length !== systemRanks.length) {
    throw new Error("教练排名和系统排名数组长度必须相同")
  }
  
  const n = coachRanks.length
  
  if (n < 3) {
    return {
      coefficient: 0,
      pValue: 1,
      n,
      interpretation: "样本量不足，无法计算相关系数",
      passed: false
    }
  }
  
  // 计算排名差
  const differences = coachRanks.map((coachRank, i) => {
    const systemRank = systemRanks[i]
    return coachRank - systemRank
  })
  
  // 计算 Σd²
  const sumSquaredDiff = differences.reduce((sum, d) => sum + d * d, 0)
  
  // 计算斯皮尔曼系数
  const coefficient = 1 - (6 * sumSquaredDiff) / (n * (n * n - 1))
  
  // 近似p值计算 (基于t分布)
  // t = ρ * √((n-2)/(1-ρ²))
  const tStatistic = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient))
  const pValue = approximatePValue(tStatistic, n - 2)
  
  // 解释
  let interpretation: string
  let passed: boolean
  
  if (coefficient > 0.9) {
    interpretation = "极强相关：系统排名与教练直觉高度一致"
    passed = true
  } else if (coefficient > 0.8) {
    interpretation = "强相关：系统表现良好，符合目标阈值"
    passed = true
  } else if (coefficient > 0.6) {
    interpretation = "中等相关：存在一定偏差，建议检查xP权重"
    passed = false
  } else if (coefficient > 0.4) {
    interpretation = "弱相关：系统存在明显问题，需要重新校准"
    passed = false
  } else {
    interpretation = "极弱相关：系统失效，必须回炉重造"
    passed = false
  }
  
  return {
    coefficient: Math.round(coefficient * 1000) / 1000,
    pValue: Math.round(pValue * 1000) / 1000,
    n,
    interpretation,
    passed
  }
}

// 近似p值计算 (简化版)
function approximatePValue(t: number, df: number): number {
  // 使用正态分布近似
  const z = t
  return 2 * (1 - normalCDF(Math.abs(z)))
}

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

// ============ 2. 置信区间覆盖率检验 ============

/**
 * 置信区间覆盖率
 * 
 * 目标: 95%置信区间下，教练真实打分有 80% 落在区间内
 */

export interface CoverageResult {
  coverageRate: number      // 覆盖率 (0-100)
  totalSamples: number
  withinInterval: number
  outsideInterval: number
  
  // 偏差分析
  avgIntervalWidth: number  // 平均区间宽度
  overConfident: number     // 过于自信的次数
  underConfident: number    // 过于保守的次数
  
  interpretation: string
  passed: boolean           // 是否通过 (coverageRate > 80%)
}

export function calculateConfidenceIntervalCoverage(
  entries: Array<{
    coachScore: number
    confidenceInterval: [number, number]  // [lower, upper]
    confidenceLevel: number              // 如 0.95
  }>
): CoverageResult {
  const n = entries.length
  
  if (n === 0) {
    return {
      coverageRate: 0,
      totalSamples: 0,
      withinInterval: 0,
      outsideInterval: 0,
      avgIntervalWidth: 0,
      overConfident: 0,
      underConfident: 0,
      interpretation: "无数据",
      passed: false
    }
  }
  
  let withinCount = 0
  let overConfidentCount = 0  // 区间太窄，实际分数超出
  let underConfidentCount = 0 // 区间太宽
  let totalWidth = 0
  
  entries.forEach(entry => {
    const [lower, upper] = entry.confidenceInterval
    const width = upper - lower
    totalWidth += width
    
    if (entry.coachScore >= lower && entry.coachScore <= upper) {
      withinCount++
    } else {
      overConfidentCount++
    }
    
    // 过于保守的判断：区间宽度 > 20 且实际分数在区间中间附近
    if (width > 20) {
      const midPoint = (lower + upper) / 2
      if (Math.abs(entry.coachScore - midPoint) < width * 0.2) {
        underConfidentCount++
      }
    }
  })
  
  const coverageRate = (withinCount / n) * 100
  
  let interpretation: string
  let passed: boolean
  
  if (coverageRate >= 90) {
    interpretation = "覆盖率优秀：置信区间估算准确"
    passed = true
  } else if (coverageRate >= 80) {
    interpretation = "覆盖率达标：符合目标阈值"
    passed = true
  } else if (coverageRate >= 70) {
    interpretation = "覆盖率不足：区间估算过于乐观，建议调整方差权重"
    passed = false
  } else {
    interpretation = "覆盖率严重不达标：置信系统失效，必须重新校准"
    passed = false
  }
  
  return {
    coverageRate: Math.round(coverageRate * 10) / 10,
    totalSamples: n,
    withinInterval: withinCount,
    outsideInterval: n - withinCount,
    avgIntervalWidth: Math.round((totalWidth / n) * 10) / 10,
    overConfident: overConfidentCount,
    underConfident: underConfidentCount,
    interpretation,
    passed
  }
}

// ============ 3. 综合验证报告 ============

export interface ValidationReport {
  // 基础统计
  totalSamples: number
  totalMatches: number
  coaches: string[]
  
  // V1 引擎验证结果
  v1: {
    mae: number           // 平均绝对误差
    rmse: number          // 均方根误差
    spearman: SpearmanResult
  }
  
  // V2 引擎验证结果
  v2: {
    mae: number
    rmse: number
    spearman: SpearmanResult
    coverage: CoverageResult
    improvement: {
      maeDelta: number
      rmseDelta: number
      spearmanDelta: number
    }
  }
  
  // 诊断分析
  diagnosis: {
    biggestDiscrepancy: Array<{
      playerName: string
      matchName: string
      coachScore: number
      v1Score: number
      v2Score: number
      gap: number
    }>
    positionBias: Record<string, {
      avgGap: number
      samples: number
    }>
  }
  
  // 结论
  conclusion: {
    v1Passed: boolean
    v2Passed: boolean
    recommendation: string
    requiredActions: string[]
  }
}

export function generateValidationReport(
  entries: GoldStandardEntry[]
): ValidationReport {
  // 准备数据
  const coachScores = entries.map(e => e.coachEvaluation.absoluteScore)
  const v1Scores = entries.map(e => e.systemScores.v1.overallScore)
  const v2Scores = entries.map(e => e.systemScores.v2.overallScore)
  
  // 计算排名 (按比赛分组)
  const matchGroups = groupBy(entries, e => e.matchId)
  const coachRanks: number[] = []
  const v1Ranks: number[] = []
  const v2Ranks: number[] = []
  
  Object.values(matchGroups).forEach(group => {
    const sortedByCoach = [...group].sort((a, b) => 
      b.coachEvaluation.absoluteScore - a.coachEvaluation.absoluteScore
    )
    const sortedByV1 = [...group].sort((a, b) => 
      b.systemScores.v1.overallScore - a.systemScores.v1.overallScore
    )
    const sortedByV2 = [...group].sort((a, b) => 
      b.systemScores.v2.overallScore - a.systemScores.v2.overallScore
    )
    
    group.forEach(entry => {
      coachRanks.push(sortedByCoach.findIndex(e => e.id === entry.id) + 1)
      v1Ranks.push(sortedByV1.findIndex(e => e.id === entry.id) + 1)
      v2Ranks.push(sortedByV2.findIndex(e => e.id === entry.id) + 1)
    })
  })
  
  // 计算指标
  const v1Spearman = calculateSpearmanCorrelation(coachRanks, v1Ranks)
  const v2Spearman = calculateSpearmanCorrelation(coachRanks, v2Ranks)
  
  const v1MAE = calculateMAE(coachScores, v1Scores)
  const v2MAE = calculateMAE(coachScores, v2Scores)
  
  const v1RMSE = calculateRMSE(coachScores, v1Scores)
  const v2RMSE = calculateRMSE(coachScores, v2Scores)
  
  // V2 覆盖率
  const coverageData = entries.map(e => ({
    coachScore: e.coachEvaluation.absoluteScore,
    confidenceInterval: e.systemScores.v2.confidenceInterval,
    confidenceLevel: 0.95
  }))
  const v2Coverage = calculateConfidenceIntervalCoverage(coverageData)
  
  // 最大差异案例
  const discrepancies = entries.map(e => ({
    playerName: e.playerName,
    matchName: e.matchName,
    coachScore: e.coachEvaluation.absoluteScore,
    v1Score: e.systemScores.v1.overallScore,
    v2Score: e.systemScores.v2.overallScore,
    gap: Math.abs(e.coachEvaluation.absoluteScore - e.systemScores.v2.overallScore)
  })).sort((a, b) => b.gap - a.gap).slice(0, 5)
  
  // 位置偏见分析
  const positionGroups = groupBy(entries, e => e.playerPosition)
  const positionBias: ValidationReport["diagnosis"]["positionBias"] = {}
  Object.entries(positionGroups).forEach(([pos, group]) => {
    const gaps = group.map(e => 
      Math.abs(e.coachEvaluation.absoluteScore - e.systemScores.v2.overallScore)
    )
    positionBias[pos] = {
      avgGap: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length * 10) / 10,
      samples: group.length
    }
  })
  
  // 结论
  const v1Passed = v1Spearman.passed
  const v2Passed = v2Spearman.passed && v2Coverage.passed
  
  const requiredActions: string[] = []
  if (!v2Spearman.passed) {
    requiredActions.push("斯皮尔曼系数不达标，检查xP权重配置")
  }
  if (!v2Coverage.passed) {
    requiredActions.push("置信区间覆盖率不足，调整方差估算参数")
  }
  if (positionBias["主攻"]?.avgGap > 10) {
    requiredActions.push("主攻位置评分偏差过大，检查位置权重模板")
  }
  
  return {
    totalSamples: entries.length,
    totalMatches: Object.keys(matchGroups).length,
    coaches: Array.from(new Set(entries.map(e => e.coachEvaluation.coachId))),
    
    v1: {
      mae: v1MAE,
      rmse: v1RMSE,
      spearman: v1Spearman
    },
    
    v2: {
      mae: v2MAE,
      rmse: v2RMSE,
      spearman: v2Spearman,
      coverage: v2Coverage,
      improvement: {
        maeDelta: Math.round((v1MAE - v2MAE) * 10) / 10,
        rmseDelta: Math.round((v1RMSE - v2RMSE) * 10) / 10,
        spearmanDelta: Math.round((v2Spearman.coefficient - v1Spearman.coefficient) * 1000) / 1000
      }
    },
    
    diagnosis: {
      biggestDiscrepancy: discrepancies,
      positionBias
    },
    
    conclusion: {
      v1Passed,
      v2Passed,
      recommendation: v2Passed 
        ? "V2引擎通过验证，可以逐步替换V1"
        : "V2引擎未通过验证，必须根据诊断结果调整",
      requiredActions
    }
  }
}

// ============ 辅助函数 ============

function calculateMAE(actual: number[], predicted: number[]): number {
  const errors = actual.map((a, i) => Math.abs(a - predicted[i]))
  return Math.round(errors.reduce((sum, e) => sum + e, 0) / errors.length * 10) / 10
}

function calculateRMSE(actual: number[], predicted: number[]): number {
  const squaredErrors = actual.map((a, i) => Math.pow(a - predicted[i], 2))
  const mse = squaredErrors.reduce((sum, e) => sum + e, 0) / squaredErrors.length
  return Math.round(Math.sqrt(mse) * 10) / 10
}

function groupBy<T>(array: T[], key: (item: T) => string): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = key(item)
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {} as Record<string, T[]>)
}

// ============ 报告导出 ============

export function exportValidationReport(report: ValidationReport): string {
  const lines: string[] = []
  
  lines.push("# Athlete Insight V2 引擎验证报告")
  lines.push(``)
  lines.push(`生成时间: ${new Date().toLocaleString("zh-CN")}`)
  lines.push(`样本量: ${report.totalSamples} (来自 ${report.totalMatches} 场比赛)`)
  lines.push(``)
  
  lines.push("## 1. 排名相关性检验 (斯皮尔曼系数)")
  lines.push(``)
  lines.push(`| 引擎 | 系数 ρ | p值 | 样本量 | 结果 |`)
  lines.push(`|------|--------|-----|--------|------|`)
  lines.push(`| V1 | ${report.v1.spearman.coefficient} | ${report.v1.spearman.pValue} | ${report.v1.spearman.n} | ${report.v1.spearman.passed ? "✅通过" : "❌未通过"} |`)
  lines.push(`| V2 | ${report.v2.spearman.coefficient} | ${report.v2.spearman.pValue} | ${report.v2.spearman.n} | ${report.v2.spearman.passed ? "✅通过" : "❌未通过"} |`)
  lines.push(``)
  lines.push(`**解释**: ${report.v2.spearman.interpretation}`)
  lines.push(``)
  
  lines.push("## 2. 置信区间覆盖率检验")
  lines.push(``)
  lines.push(`- 覆盖率: ${report.v2.coverage.coverageRate}%`)
  lines.push(`- 目标: 80% @ 95%置信水平`)
  lines.push(`- 结果: ${report.v2.coverage.passed ? "✅通过" : "❌未通过"}`)
  lines.push(``)
  lines.push(`**解释**: ${report.v2.coverage.interpretation}`)
  lines.push(``)
  
  lines.push("## 3. 绝对误差对比")
  lines.push(``)
  lines.push(`| 指标 | V1 | V2 | 改进 |`)
  lines.push(`|------|-----|-----|------|`)
  lines.push(`| MAE | ${report.v1.mae} | ${report.v2.mae} | ${report.v2.improvement.maeDelta > 0 ? "+" : ""}${report.v2.improvement.maeDelta} |`)
  lines.push(`| RMSE | ${report.v1.rmse} | ${report.v2.rmse} | ${report.v2.improvement.rmseDelta > 0 ? "+" : ""}${report.v2.improvement.rmseDelta} |`)
  lines.push(``)
  
  lines.push("## 4. 诊断分析")
  lines.push(``)
  lines.push("### 最大差异案例")
  lines.push(``)
  report.diagnosis.biggestDiscrepancy.forEach((d, i) => {
    lines.push(`${i + 1}. ${d.playerName} @ ${d.matchName}`)
    lines.push(`   - 教练评分: ${d.coachScore}, 系统V2: ${d.v2Score}, 差距: ${d.gap}`)
  })
  lines.push(``)
  
  lines.push("### 位置偏见分析")
  lines.push(``)
  lines.push(`| 位置 | 平均偏差 | 样本量 |`)
  lines.push(`|------|----------|--------|`)
  Object.entries(report.diagnosis.positionBias).forEach(([pos, data]) => {
    lines.push(`| ${pos} | ${data.avgGap} | ${data.samples} |`)
  })
  lines.push(``)
  
  lines.push("## 5. 结论与行动")
  lines.push(``)
  lines.push(`**V1引擎**: ${report.conclusion.v1Passed ? "✅通过" : "❌未通过"}`)
  lines.push(`**V2引擎**: ${report.conclusion.v2Passed ? "✅通过" : "❌未通过"}`)
  lines.push(``)
  lines.push(`**建议**: ${report.conclusion.recommendation}`)
  lines.push(``)
  
  if (report.conclusion.requiredActions.length > 0) {
    lines.push("**必须执行的行动**:")
    report.conclusion.requiredActions.forEach((action, i) => {
      lines.push(`${i + 1}. ${action}`)
    })
  }
  
  return lines.join("\n")
}
