/**
 * 数据确定性类型系统
 * 
 * 每个字段都可以标记数据来源类型，让报告可信度更透明
 */

// 数据来源类型
export type DataSourceType = 
  | "exact"      // 精确统计（有技术统计表/录像回放确认）
  | "estimated"  // 估算（赛后记忆，大致数字）
  | "subjective" // 主观评估（感觉/印象）
  | "missing"    // 缺失（未填写）

// 字段确定性配置
export interface FieldCertainty {
  value: number | string | undefined
  source: DataSourceType
  confidence: number // 0-100，系统计算的置信度
}

// 完整表单的确定性映射
export interface FormCertaintyMap {
  [fieldName: string]: FieldCertainty
}

// 数据来源类型标签
export const dataSourceLabels: Record<DataSourceType, { label: string; description: string; color: string }> = {
  exact: {
    label: "精确",
    description: "有技术统计表或录像确认",
    color: "var(--accent)",
  },
  estimated: {
    label: "估算",
    description: "赛后回忆的大致数字",
    color: "var(--info)",
  },
  subjective: {
    label: "主观",
    description: "基于观察和感觉",
    color: "var(--warning)",
  },
  missing: {
    label: "缺失",
    description: "未提供此数据",
    color: "var(--text-muted)",
  },
}

// 快速模式默认确定性配置
export const quickModeDefaultCertainties: Record<string, DataSourceType> = {
  overallPerformance: "subjective",
  scoringRating: "subjective",
  errorRating: "subjective",
  receptionRating: "subjective",
  clutchRating: "subjective",
  pointsScored: "estimated",
  pointsLost: "estimated",
  majorErrors: "estimated",
}

// 专业模式默认确定性配置
export const professionalModeDefaultCertainties: Record<string, DataSourceType> = {
  // 基础统计通常是精确的
  totalPoints: "exact",
  totalPointsLost: "exact",
  serveAces: "exact",
  serveErrors: "exact",
  attackKills: "exact",
  attackErrors: "exact",
  blockedTimes: "exact",
  blockPoints: "exact",
  digs: "exact",
  // 一传看输入模式
  receptionSuccessRate: "exact",
  receptionRating: "subjective",
  // 关键分看输入模式
  clutchPerformanceScore: "exact",
  clutchRating: "subjective",
}

// 计算整体数据可信度
export function calculateOverallDataQuality(
  certaintyMap: FormCertaintyMap
): {
  overallCertainty: number
  exactCount: number
  estimatedCount: number
  subjectiveCount: number
  missingCount: number
  qualityLabel: string
} {
  const fields = Object.values(certaintyMap)
  const total = fields.length
  
  if (total === 0) {
    return {
      overallCertainty: 0,
      exactCount: 0,
      estimatedCount: 0,
      subjectiveCount: 0,
      missingCount: 0,
      qualityLabel: "无数据",
    }
  }
  
  const exactCount = fields.filter(f => f.source === "exact").length
  const estimatedCount = fields.filter(f => f.source === "estimated").length
  const subjectiveCount = fields.filter(f => f.source === "subjective").length
  const missingCount = fields.filter(f => f.source === "missing").length
  
  // 计算加权可信度分数
  const weights = {
    exact: 1.0,
    estimated: 0.7,
    subjective: 0.4,
    missing: 0,
  }
  
  const weightedScore = 
    exactCount * weights.exact +
    estimatedCount * weights.estimated +
    subjectiveCount * weights.subjective +
    missingCount * weights.missing
  
  const overallCertainty = Math.round((weightedScore / total) * 100)
  
  // 质量标签
  let qualityLabel = ""
  if (overallCertainty >= 80) qualityLabel = "高可信度"
  else if (overallCertainty >= 50) qualityLabel = "中等可信度"
  else qualityLabel = "低可信度"
  
  return {
    overallCertainty,
    exactCount,
    estimatedCount,
    subjectiveCount,
    missingCount,
    qualityLabel,
  }
}

// 生成数据质量说明文本
export function generateDataQualityNotes(
  certaintyMap: FormCertaintyMap
): string {
  const { overallCertainty, qualityLabel, exactCount, subjectiveCount } = 
    calculateOverallDataQuality(certaintyMap)
  
  const parts: string[] = []
  parts.push(`本报告基于${qualityLabel}数据生成`)
  
  if (exactCount > 0) {
    parts.push(`，包含${exactCount}项精确统计`)
  }
  if (subjectiveCount > 0) {
    parts.push(`，${subjectiveCount}项为主观评估`)
  }
  
  parts.push("。建议结合比赛录像综合判断。")
  
  return parts.join("")
}
