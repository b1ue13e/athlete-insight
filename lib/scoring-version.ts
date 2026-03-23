/**
 * 评分引擎版本化系统
 * 
 * 核心设计：
 * 1. 每次修改评分逻辑必须更新版本号
 * 2. 历史趋势计算时需要考虑引擎版本
 * 3. 报告必须记录使用的引擎版本
 * 4. 支持多版本并存和对比
 */

// ============ 版本定义 ============

export interface ScoringVersion {
  major: number      // 大版本：重大算法调整
  minor: number      // 小版本：权重调整、bug修复
  patch: number      // 补丁：文案调整、非计算改动
  templateVersion: number  // 位置模板版本
}

export interface VersionInfo {
  version: ScoringVersion
  versionString: string
  releaseDate: string
  changes: string[]
  breakingChanges: boolean
}

// 当前版本
export const CURRENT_SCORING_VERSION: ScoringVersion = {
  major: 2,
  minor: 0,
  patch: 0,
  templateVersion: 1,
}

// 版本历史
export const SCORING_VERSION_HISTORY: VersionInfo[] = [
  {
    version: { major: 1, minor: 0, patch: 0, templateVersion: 1 },
    versionString: "1.0.0-t1",
    releaseDate: "2026-03-20",
    changes: ["初始版本", "单一总分计算"],
    breakingChanges: false,
  },
  {
    version: { major: 2, minor: 0, patch: 0, templateVersion: 1 },
    versionString: "2.0.0-t1",
    releaseDate: "2026-03-23",
    changes: [
      "重构为四维子评分模型",
      "引入位置感知权重模板",
      "新增数据完整度影响",
      "新增可信性说明",
    ],
    breakingChanges: true, // 与 v1 不兼容
  },
]

// ============ 版本工具函数 ============

export function versionToString(v: ScoringVersion): string {
  return `${v.major}.${v.minor}.${v.patch}-t${v.templateVersion}`
}

export function parseVersionString(s: string): ScoringVersion | null {
  const match = s.match(/^(\d+)\.(\d+)\.(\d+)-t(\d+)$/)
  if (!match) return null
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    templateVersion: parseInt(match[4]),
  }
}

export function isVersionCompatible(v1: ScoringVersion, v2: ScoringVersion): boolean {
  // 大版本相同才算兼容
  return v1.major === v2.major
}

export function compareVersions(v1: ScoringVersion, v2: ScoringVersion): number {
  const fields: (keyof ScoringVersion)[] = ['major', 'minor', 'patch', 'templateVersion']
  for (const field of fields) {
    if (v1[field] !== v2[field]) {
      return v1[field] - v2[field]
    }
  }
  return 0
}

export function isNewerVersion(v1: ScoringVersion, v2: ScoringVersion): boolean {
  return compareVersions(v1, v2) > 0
}

// ============ 版本信息获取 ============

export function getCurrentVersionInfo(): VersionInfo {
  return {
    version: CURRENT_SCORING_VERSION,
    versionString: versionToString(CURRENT_SCORING_VERSION),
    releaseDate: SCORING_VERSION_HISTORY[SCORING_VERSION_HISTORY.length - 1].releaseDate,
    changes: SCORING_VERSION_HISTORY[SCORING_VERSION_HISTORY.length - 1].changes,
    breakingChanges: SCORING_VERSION_HISTORY[SCORING_VERSION_HISTORY.length - 1].breakingChanges,
  }
}

export function getVersionHistory(): VersionInfo[] {
  return [...SCORING_VERSION_HISTORY]
}

export function getVersionInfo(versionString: string): VersionInfo | undefined {
  return SCORING_VERSION_HISTORY.find(v => v.versionString === versionString)
}

// ============ 趋势分析版本处理 ============

export interface VersionedTrendAnalysis {
  // 是否跨版本比较
  crossVersionAnalysis: boolean
  // 涉及的版本
  versionsInvolved: string[]
  // 版本切换警告
  versionSwitchWarnings: string[]
  // 调整后的趋势（尝试消除版本影响）
  adjustedTrend?: {
    direction: "improving" | "declining" | "stable" | "uncertain"
    confidence: number
    note: string
  }
}

/**
 * 分析趋势时检查版本一致性
 */
export function analyzeVersionConsistency(sessionVersions: string[]): VersionedTrendAnalysis {
  const versions = sessionVersions.map(parseVersionString).filter((v): v is ScoringVersion => v !== null)
  
  if (versions.length === 0) {
    return {
      crossVersionAnalysis: false,
      versionsInvolved: [],
      versionSwitchWarnings: [],
    }
  }
  
  const uniqueMajors = new Set(versions.map(v => v.major))
  const versionStrings = versions.map(versionToString)
  const uniqueVersions = Array.from(new Set(versionStrings))
  
  const warnings: string[] = []
  
  if (uniqueMajors.size > 1) {
    warnings.push(`检测到跨大版本比较 (${Array.from(uniqueMajors).join(', ')})，分数变化可能受评分规则调整影响`)
    
    // 检查是否有 breaking changes
    const breakingVersions = SCORING_VERSION_HISTORY
      .filter(v => v.breakingChanges && uniqueVersions.includes(v.versionString))
      .map(v => v.versionString)
    
    if (breakingVersions.length > 0) {
      warnings.push(`以下版本包含破坏性变更: ${breakingVersions.join(', ')}`)
    }
  }
  
  return {
    crossVersionAnalysis: uniqueMajors.size > 1,
    versionsInvolved: uniqueVersions,
    versionSwitchWarnings: warnings,
    adjustedTrend: uniqueMajors.size > 1 ? {
      direction: "uncertain",
      confidence: 0.3,
      note: "跨版本比较，趋势结论置信度降低",
    } : undefined,
  }
}

// ============ 报告元数据 ============

export interface ScoringMetadata {
  version: string
  templateVersion: string
  positionTemplate: string
  dataCompleteness: number
  confidenceLevel: "high" | "medium" | "low"
  calculationTimestamp: string
}

export function generateScoringMetadata(
  position: string,
  dataCompleteness: number
): ScoringMetadata {
  const version = getCurrentVersionInfo()
  
  let confidence: "high" | "medium" | "low"
  if (dataCompleteness >= 0.9) confidence = "high"
  else if (dataCompleteness >= 0.7) confidence = "medium"
  else confidence = "low"
  
  return {
    version: version.versionString,
    templateVersion: `t${version.version.templateVersion}`,
    positionTemplate: position,
    dataCompleteness,
    confidenceLevel: confidence,
    calculationTimestamp: new Date().toISOString(),
  }
}

// ============ 调试信息 ============

export interface ScoringDebugInfo {
  version: string
  positionWeights: {
    position: string
    overallWeights: Record<string, number>
    metricWeights: Record<string, Record<string, number>>
  }
  calculationSteps: {
    step: string
    input: unknown
    output: unknown
    formula?: string
  }[]
  dataQuality: {
    completeness: number
    missingFields: string[]
    lowConfidenceFields: string[]
  }
  intermediateScores: Record<string, number>
}

export function createDebugInfoContainer(): {
  debugInfo: ScoringDebugInfo
  addStep: (step: string, input: unknown, output: unknown, formula?: string) => void
} {
  const debugInfo: ScoringDebugInfo = {
    version: versionToString(CURRENT_SCORING_VERSION),
    positionWeights: {
      position: "",
      overallWeights: {},
      metricWeights: {},
    },
    calculationSteps: [],
    dataQuality: {
      completeness: 0,
      missingFields: [],
      lowConfidenceFields: [],
    },
    intermediateScores: {},
  }
  
  return {
    debugInfo,
    addStep: (step, input, output, formula) => {
      debugInfo.calculationSteps.push({ step, input, output, formula })
    },
  }
}
