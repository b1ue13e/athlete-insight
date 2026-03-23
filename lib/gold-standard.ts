/**
 * 人工金标准 (Gold Standard) 标注系统
 * 
 * 用于验证系统输出与真人判断的一致性。
 * 
 * 标注者只需回答5个简单问题：
 * 1. 整体表现等级 (高/中/低)
 * 2. 最大优点
 * 3. 最大问题
 * 4. 优先改进点
 * 5. 不应出现的标签
 * 
 * 然后系统自动对比分析。
 */

import { VolleyballFormData, ReportJSON } from "@/types"
import { analyzeVolleyball } from "./mock-analysis"
import { evaluationBenchmarks } from "./evaluation-benchmark"

// ============ 标注结构 ============

export interface HumanAnnotation {
  // 标注元信息
  annotator_id: string
  annotator_role: "coach" | "captain" | "player" | "expert"
  annotation_date: string
  
  // 标注内容
  overall_rating: "high" | "medium" | "low"
  top_strength: string
  top_weakness: string
  priority_action: string
  invalid_tags: string[]
  
  // 置信度
  confidence: "high" | "medium" | "low"
  notes?: string
}

export interface GoldStandardCase {
  id: string
  input: VolleyballFormData
  human_annotations: HumanAnnotation[]
  // 聚合后的人工共识
  consensus?: {
    overall_rating: "high" | "medium" | "low"
    top_strengths: string[]
    top_weaknesses: string[]
    priority_actions: string[]
    confidence: number
  }
}

export interface ValidationResult {
  case_id: string
  // 整体评分对比
  rating_match: boolean
  system_rating: "high" | "medium" | "low"
  human_rating: "high" | "medium" | "low"
  
  // 优点匹配
  strength_match: boolean
  system_strengths: string[]
  human_strengths: string[]
  
  // 问题匹配
  weakness_match: boolean
  system_weaknesses: string[]
  human_weaknesses: string[]
  
  // 建议可执行性
  action_relevance: number // 0-1
  
  // 标签合理性
  invalid_tag_hits: string[] // 系统给出了人工认为不该出现的标签
  
  // 综合一致性
  consistency_score: number // 0-100
}

// ============ 人工标注数据集 ============

export const goldStandardDataset: GoldStandardCase[] = [
  {
    id: "GS001",
    input: evaluationBenchmarks[0].input, // 高得分高失误型
    human_annotations: [
      {
        annotator_id: "coach_001",
        annotator_role: "coach",
        annotation_date: "2026-03-23",
        overall_rating: "medium",
        top_strength: "进攻端威胁大，能下球",
        top_weakness: "失误太多，尤其是发球",
        priority_action: "先练发球稳定性，不要一味追求ACE",
        invalid_tags: ["VB_DEFENSE_SOLID"], // 救球5个不该判防守扎实
        confidence: "high",
        notes: "典型的神经刀表现",
      },
    ],
  },
  {
    id: "GS002",
    input: evaluationBenchmarks[4].input, // 自由人
    human_annotations: [
      {
        annotator_id: "coach_001",
        annotator_role: "coach",
        annotation_date: "2026-03-23",
        overall_rating: "high",
        top_strength: "一传稳，防守面积大",
        top_weakness: "作为自由人基本没弱点",
        priority_action: "保持状态",
        invalid_tags: ["VB_SCORING_STRONG", "VB_ATTACK_EFFECTIVE"], // 自由人不该有进攻标签
        confidence: "high",
        notes: "标准自由人表现",
      },
    ],
  },
  {
    id: "GS003",
    input: evaluationBenchmarks[2].input, // 关键分弱
    human_annotations: [
      {
        annotator_id: "captain_001",
        annotator_role: "captain",
        annotation_date: "2026-03-23",
        overall_rating: "medium",
        top_strength: "平时打得还可以",
        top_weakness: "关键时刻手软，局末掉链子",
        priority_action: "多练关键分，模拟压力场景",
        invalid_tags: [],
        confidence: "high",
        notes: "心理层面问题",
      },
    ],
  },
  {
    id: "GS004",
    input: evaluationBenchmarks[5].input, // 全面低迷
    human_annotations: [
      {
        annotator_id: "coach_001",
        annotator_role: "coach",
        annotation_date: "2026-03-23",
        overall_rating: "low",
        top_strength: "暂时想不出",
        top_weakness: "全面被压制，什么都做不好",
        priority_action: "回去先练基本功，这场先忘掉",
        invalid_tags: ["VB_SCORING_STRONG"],
        confidence: "high",
        notes: "状态极差，可能身体或心理有问题",
      },
    ],
  },
  {
    id: "GS005",
    input: evaluationBenchmarks[7].input, // 稳定高效
    human_annotations: [
      {
        annotator_id: "coach_001",
        annotator_role: "coach",
        annotation_date: "2026-03-23",
        overall_rating: "high",
        top_strength: "全面，稳定，没有明显短板",
        top_weakness: "没有",
        priority_action: "保持，可以尝试增加变化",
        invalid_tags: [],
        confidence: "high",
        notes: "理想的校队主力表现",
      },
    ],
  },
]

// ============ 验证逻辑 ============

/**
 * 将系统总分映射为等级
 */
function scoreToRating(score: number): "high" | "medium" | "low" {
  if (score >= 75) return "high"
  if (score >= 60) return "medium"
  return "low"
}

/**
 * 检查文本相似度（简单实现）
 */
function textSimilarity(text1: string, text2: string): number {
  const keywords1 = text1.split(/[，。、\s]+/)
  const keywords2 = text2.split(/[，。、\s]+/)
  
  const intersection = keywords1.filter(k => 
    keywords2.some(k2 => k2.includes(k) || k.includes(k2))
  )
  
  return intersection.length / Math.max(keywords1.length, keywords2.length)
}

/**
 * 验证单个用例
 */
export function validateCase(
  caseData: GoldStandardCase,
  systemReport: ReportJSON
): ValidationResult {
  // 获取人工共识（简化：取第一个标注）
  const human = caseData.human_annotations[0]
  
  // 系统评级
  const systemRating = scoreToRating(systemReport.overview.overall_score)
  
  // 优点匹配
  const systemStrengths = systemReport.strengths.map(s => s.title)
  const strengthMatch = systemStrengths.some(s => 
    textSimilarity(s, human.top_strength) > 0.3
  )
  
  // 问题匹配
  const systemWeaknesses = systemReport.weaknesses.map(w => w.title)
  const weaknessMatch = systemWeaknesses.some(w => 
    textSimilarity(w, human.top_weakness) > 0.3
  )
  
  // 检查无效标签
  const invalidTagHits = human.invalid_tags.filter(tag =>
    systemReport.tags.includes(tag)
  )
  
  // 建议相关性（检查建议是否包含人工指出的优先改进点关键词）
  const systemActions = systemReport.recommendations.map(r => r.title + r.detail)
  const actionRelevance = systemActions.some(a => 
    textSimilarity(a, human.priority_action) > 0.2
  ) ? 1 : 0
  
  // 计算综合一致性分数
  let consistencyScore = 0
  if (systemRating === human.overall_rating) consistencyScore += 40
  if (strengthMatch) consistencyScore += 25
  if (weaknessMatch) consistencyScore += 25
  if (invalidTagHits.length === 0) consistencyScore += 10
  
  return {
    case_id: caseData.id,
    rating_match: systemRating === human.overall_rating,
    system_rating: systemRating,
    human_rating: human.overall_rating,
    strength_match: strengthMatch,
    system_strengths: systemStrengths,
    human_strengths: [human.top_strength],
    weakness_match: weaknessMatch,
    system_weaknesses: systemWeaknesses,
    human_weaknesses: [human.top_weakness],
    action_relevance: actionRelevance,
    invalid_tag_hits: invalidTagHits,
    consistency_score: consistencyScore,
  }
}

/**
 * 运行全部验证
 */
export function runGoldStandardValidation(): {
  results: ValidationResult[]
  summary: {
    total_cases: number
    rating_accuracy: number
    strength_accuracy: number
    weakness_accuracy: number
    tag_validity: number
    avg_consistency: number
  }
} {
  const results = goldStandardDataset.map(caseData => {
    const report = analyzeVolleyball(caseData.input)
    return validateCase(caseData, report)
  })
  
  const summary = {
    total_cases: results.length,
    rating_accuracy: results.filter(r => r.rating_match).length / results.length,
    strength_accuracy: results.filter(r => r.strength_match).length / results.length,
    weakness_accuracy: results.filter(r => r.weakness_match).length / results.length,
    tag_validity: 1 - (results.reduce((acc, r) => acc + r.invalid_tag_hits.length, 0) / 
                      results.reduce((acc, r) => acc + r.system_weaknesses.length, 0)),
    avg_consistency: results.reduce((acc, r) => acc + r.consistency_score, 0) / results.length,
  }
  
  return { results, summary }
}

/**
 * 生成验证报告
 */
export function generateValidationReport(): string {
  const { results, summary } = runGoldStandardValidation()
  
  let report = `
========== 人工金标准验证报告 ==========
验证时间: ${new Date().toISOString()}
样本数: ${summary.total_cases}

【一致性指标】
整体评级准确率: ${(summary.rating_accuracy * 100).toFixed(1)}%
优点识别准确率: ${(summary.strength_accuracy * 100).toFixed(1)}%
问题识别准确率: ${(summary.weakness_accuracy * 100).toFixed(1)}%
标签合理性: ${(summary.tag_validity * 100).toFixed(1)}%
平均一致度: ${summary.avg_consistency.toFixed(1)}/100

【详细对比】
`
  
  results.forEach(r => {
    report += `
[${r.case_id}]
评级: 系统[${r.system_rating}] vs 人工[${r.human_rating}] ${r.rating_match ? "✅" : "❌"}
优点: ${r.strength_match ? "✅" : "❌"} 系统(${r.system_strengths.join(", ")}) vs 人工(${r.human_strengths.join(", ")})
问题: ${r.weakness_match ? "✅" : "❌"} 系统(${r.system_weaknesses.join(", ")}) vs 人工(${r.human_weaknesses.join(", ")})
无效标签: ${r.invalid_tag_hits.length > 0 ? "⚠️ " + r.invalid_tag_hits.join(", ") : "✅ 无"}
一致度: ${r.consistency_score}/100
`
  })
  
  report += `
========== 总结 ==========
${summary.avg_consistency >= 70 ? "✅ 系统表现良好，与人工判断高度一致" : 
  summary.avg_consistency >= 50 ? "⚠️ 系统表现尚可，部分场景需优化" : 
  "❌ 系统与人工判断偏差较大，需重点改进"}

建议优化方向:
`
  
  if (summary.rating_accuracy < 0.8) {
    report += "- 整体评分区间需校准\n"
  }
  if (summary.strength_accuracy < 0.7) {
    report += "- 优点识别逻辑需调整\n"
  }
  if (summary.weakness_accuracy < 0.7) {
    report += "- 问题识别逻辑需调整\n"
  }
  if (summary.tag_validity < 0.9) {
    report += "- 标签触发条件需收紧\n"
  }
  
  return report
}

/**
 * 添加人工标注
 */
export function addHumanAnnotation(
  caseId: string,
  annotation: HumanAnnotation
): void {
  const caseData = goldStandardDataset.find(c => c.id === caseId)
  if (caseData) {
    caseData.human_annotations.push(annotation)
  }
}
