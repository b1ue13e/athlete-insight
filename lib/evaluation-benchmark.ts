/**
 * 评估基准 (Evaluation Benchmark)
 * 
 * 把 10 份典型样例升级为可回归测试的评估集。
 * 每次修改评分引擎后，运行测试验证：
 * 1. 总分是否在预期区间
 * 2. 标签是否正确触发
 * 3. 优势和问题是否符合预期
 * 4. 位置解释是否合理
 */

import { VolleyballFormData, ReportJSON } from "@/types"
import { analyzeVolleyball } from "./mock-analysis"

// ============ 评估基准定义 ============

interface ExpectedOutcome {
  // 总分预期区间 [min, max]
  scoreRange: [number, number]
  // 预期必须出现的标签
  mustHaveTags: string[]
  // 预期不能出现的标签
  mustNotHaveTags: string[]
  // 预期优势数量范围
  strengthsCount: [number, number]
  // 预期问题数量范围
  weaknessesCount: [number, number]
  // 关键维度预期（子评分应在的区间）
  subScoreExpectations: {
    scoring_contribution?: [number, number]
    error_control?: [number, number]
    stability?: [number, number]
    clutch_performance?: [number, number]
  }
  // 合理性检查
  rationalityChecks: {
    // 描述，用于测试失败时输出
    description: string
    // 检查函数
    check: (report: ReportJSON) => boolean
  }[]
}

interface BenchmarkCase {
  id: string
  name: string
  description: string
  // 球员画像
  playerProfile: {
    position: VolleyballFormData["player_position"]
    style: string
  }
  input: VolleyballFormData
  expected: ExpectedOutcome
}

// ============ 10份评估基准 ============

export const evaluationBenchmarks: BenchmarkCase[] = [
  {
    id: "B001",
    name: "高得分高失误型",
    description: "进攻能力强但稳定性不足的主攻",
    playerProfile: { position: "主攻", style: "高上限高波动" },
    input: {
      match_name: "vs 计算机学院",
      opponent: "计算机学院",
      player_position: "主攻",
      session_date: "2026-03-20",
      total_points: 22,
      total_points_lost: 12,
      serve_aces: 4,
      serve_errors: 5,
      attack_kills: 16,
      attack_errors: 5,
      blocked_times: 3,
      reception_success_rate: 58,
      block_points: 1,
      digs: 5,
      clutch_performance_score: 72,
      error_tags: ["发球失误", "扣球失误"],
      notes: "进攻端贡献突出，但失误偏多",
    },
    expected: {
      scoreRange: [70, 82],
      mustHaveTags: ["VB_SCORING_STRONG", "VB_ERROR_PRONE"],
      mustNotHaveTags: ["VB_STABILITY_ISSUE"], // 稳定性问题不应该作为主要标签
      strengthsCount: [2, 3],
      weaknessesCount: [2, 3],
      subScoreExpectations: {
        scoring_contribution: [75, 95],
        error_control: [45, 65],
        stability: [50, 70],
      },
      rationalityChecks: [
        {
          description: "得分贡献应该显著高于失误控制",
          check: (r) => (r.overview.sub_scores?.scoring_contribution || 0) > (r.overview.sub_scores?.error_control || 0) + 10,
        },
        {
          description: "优势中应该提到进攻相关",
          check: (r) => r.strengths.some(s => s.title.includes("进攻") || s.title.includes("得分")),
        },
      ],
    },
  },
  
  {
    id: "B002",
    name: "低失误稳定型",
    description: "表现稳定但缺乏爆发力",
    playerProfile: { position: "接应", style: "稳定保守" },
    input: {
      match_name: "vs 机械学院",
      opponent: "机械学院",
      player_position: "接应",
      session_date: "2026-03-20",
      total_points: 14,
      total_points_lost: 11,
      serve_aces: 1,
      serve_errors: 1,
      attack_kills: 9,
      attack_errors: 1,
      blocked_times: 1,
      reception_success_rate: 72,
      block_points: 2,
      digs: 7,
      clutch_performance_score: 68,
      error_tags: [],
      notes: "表现稳定但缺乏爆发力",
    },
    expected: {
      scoreRange: [68, 78],
      mustHaveTags: [], // 没有突出问题
      mustNotHaveTags: ["VB_ERROR_PRONE", "VB_ERROR_CONTROL_WEAK"],
      strengthsCount: [1, 2],
      weaknessesCount: [0, 1],
      subScoreExpectations: {
        error_control: [70, 90],
        stability: [65, 85],
        scoring_contribution: [55, 75],
      },
      rationalityChecks: [
        {
          description: "失误控制应该高于得分贡献",
          check: (r) => (r.overview.sub_scores?.error_control || 0) >= (r.overview.sub_scores?.scoring_contribution || 0),
        },
      ],
    },
  },
  
  {
    id: "B003",
    name: "关键分掉链子型",
    description: "常规表现好但关键分处理欠佳",
    playerProfile: { position: "主攻", style: "心理波动型" },
    input: {
      match_name: "vs 经管学院",
      opponent: "经管学院",
      player_position: "主攻",
      session_date: "2026-03-20",
      total_points: 18,
      total_points_lost: 9,
      serve_aces: 3,
      serve_errors: 2,
      attack_kills: 12,
      attack_errors: 3,
      blocked_times: 2,
      reception_success_rate: 68,
      block_points: 2,
      digs: 6,
      clutch_performance_score: 48,
      error_tags: ["关键分处理"],
      notes: "常规时间不错，关键分连续失误",
    },
    expected: {
      scoreRange: [62, 72],
      mustHaveTags: ["VB_CLUTCH_WEAK"],
      mustNotHaveTags: [],
      strengthsCount: [2, 3],
      weaknessesCount: [1, 2],
      subScoreExpectations: {
        scoring_contribution: [65, 85],
        clutch_performance: [40, 55],
      },
      rationalityChecks: [
        {
          description: "关键分应该显著低于其他维度",
          check: (r) => {
            const clutch = r.overview.sub_scores?.clutch_performance || 0
            const others = [
              r.overview.sub_scores?.scoring_contribution || 0,
              r.overview.sub_scores?.error_control || 0,
              r.overview.sub_scores?.stability || 0,
            ]
            const avgOthers = others.reduce((a, b) => a + b, 0) / others.length
            return clutch < avgOthers - 10
          },
        },
        {
          description: "问题中应该提到关键分",
          check: (r) => r.weaknesses.some(w => w.title.includes("关键分")),
        },
      ],
    },
  },
  
  {
    id: "B004",
    name: "一传拖后腿型",
    description: "进攻尚可但一传问题严重",
    playerProfile: { position: "主攻", style: "攻强守弱" },
    input: {
      match_name: "vs 法学院",
      opponent: "法学院",
      player_position: "主攻",
      session_date: "2026-03-20",
      total_points: 16,
      total_points_lost: 10,
      serve_aces: 2,
      serve_errors: 3,
      attack_kills: 11,
      attack_errors: 2,
      blocked_times: 2,
      reception_success_rate: 48,
      block_points: 2,
      digs: 5,
      clutch_performance_score: 62,
      error_tags: ["一传不到位"],
      notes: "一传到位率严重影响进攻组织",
    },
    expected: {
      scoreRange: [58, 68],
      mustHaveTags: ["VB_RECEPTION_VOLATILE"],
      mustNotHaveTags: [],
      strengthsCount: [1, 2],
      weaknessesCount: [2, 3],
      subScoreExpectations: {
        stability: [40, 60],
      },
      rationalityChecks: [
        {
          description: "稳定性应该是最低分项",
          check: (r) => {
            const scores = r.overview.sub_scores
            if (!scores) return false
            return scores.stability <= scores.scoring_contribution &&
                   scores.stability <= scores.error_control &&
                   scores.stability <= scores.clutch_performance
          },
        },
      ],
    },
  },
  
  {
    id: "B005",
    name: "防守积极型自由人",
    description: "标准自由人表现，专注防守",
    playerProfile: { position: "自由人", style: "防守核心" },
    input: {
      match_name: "vs 医学院",
      opponent: "医学院",
      player_position: "自由人",
      session_date: "2026-03-20",
      total_points: 3,
      total_points_lost: 8,
      serve_aces: 0,
      serve_errors: 0,
      attack_kills: 0,
      attack_errors: 1,
      blocked_times: 0,
      reception_success_rate: 76,
      block_points: 0,
      digs: 18,
      clutch_performance_score: 70,
      error_tags: [],
      notes: "防守端表现亮眼，一传稳定",
    },
    expected: {
      scoreRange: [68, 78],
      mustHaveTags: ["VB_DEFENSE_SOLID"],
      mustNotHaveTags: ["VB_SCORING_STRONG"], // 自由人不应该被判得分强
      strengthsCount: [2, 3],
      weaknessesCount: [0, 1],
      subScoreExpectations: {
        stability: [70, 90],
        scoring_contribution: [30, 60], // 自由人得分贡献应该较低
      },
      rationalityChecks: [
        {
          description: "得分贡献应该明显低于其他位置同分数",
          check: (r) => (r.overview.sub_scores?.scoring_contribution || 0) < 60,
        },
        {
          description: "稳定性应该较高",
          check: (r) => (r.overview.sub_scores?.stability || 0) >= 70,
        },
        {
          description: "不应该有进攻相关的弱点",
          check: (r) => !r.weaknesses.some(w => w.title.includes("进攻") || w.title.includes("得分")),
        },
      ],
    },
  },
  
  {
    id: "B006",
    name: "全面低迷型",
    description: "各方面均低于正常水平",
    playerProfile: { position: "主攻", style: "状态全无" },
    input: {
      match_name: "vs 体育学院",
      opponent: "体育学院",
      player_position: "主攻",
      session_date: "2026-03-20",
      total_points: 8,
      total_points_lost: 18,
      serve_aces: 0,
      serve_errors: 6,
      attack_kills: 5,
      attack_errors: 6,
      blocked_times: 4,
      reception_success_rate: 52,
      block_points: 0,
      digs: 3,
      clutch_performance_score: 45,
      error_tags: ["发球失误", "扣球失误", "被拦", "一传不到位"],
      notes: "各方面表现均低于正常水平",
    },
    expected: {
      scoreRange: [40, 55],
      mustHaveTags: ["VB_ERROR_PRONE"],
      mustNotHaveTags: [],
      strengthsCount: [0, 1],
      weaknessesCount: [3, 4],
      subScoreExpectations: {
        scoring_contribution: [30, 50],
        error_control: [25, 45],
        stability: [35, 55],
        clutch_performance: [35, 55],
      },
      rationalityChecks: [
        {
          description: "所有子评分都应该低于60",
          check: (r) => {
            const scores = r.overview.sub_scores
            if (!scores) return false
            return scores.scoring_contribution < 60 &&
                   scores.error_control < 60 &&
                   scores.stability < 60 &&
                   scores.clutch_performance < 60
          },
        },
        {
          description: "问题应该多于优势",
          check: (r) => r.weaknesses.length > r.strengths.length,
        },
      ],
    },
  },
  
  {
    id: "B007",
    name: "爆发但波动型",
    description: "高光与失误并存",
    playerProfile: { position: "接应", style: "神经刀" },
    input: {
      match_name: "vs 艺术学院",
      opponent: "艺术学院",
      player_position: "接应",
      session_date: "2026-03-20",
      total_points: 20,
      total_points_lost: 15,
      serve_aces: 5,
      serve_errors: 4,
      attack_kills: 14,
      attack_errors: 4,
      blocked_times: 3,
      reception_success_rate: 55,
      block_points: 1,
      digs: 4,
      clutch_performance_score: 75,
      error_tags: ["发球失误", "状态波动"],
      notes: "高光时刻不少，但稳定性极差",
    },
    expected: {
      scoreRange: [70, 80],
      mustHaveTags: ["VB_SCORING_STRONG", "VB_ERROR_PRONE"],
      mustNotHaveTags: [],
      strengthsCount: [2, 3],
      weaknessesCount: [2, 3],
      subScoreExpectations: {
        scoring_contribution: [75, 90],
        error_control: [45, 65],
      },
      rationalityChecks: [
        {
          description: "得分贡献高但失误控制低",
          check: (r) => {
            const scoring = r.overview.sub_scores?.scoring_contribution || 0
            const error = r.overview.sub_scores?.error_control || 0
            return scoring > 75 && error < 65
          },
        },
      ],
    },
  },
  
  {
    id: "B008",
    name: "稳定高效型",
    description: "全面优秀的标杆表现",
    playerProfile: { position: "主攻", style: "完美表现" },
    input: {
      match_name: "vs 外语学院",
      opponent: "外语学院",
      player_position: "主攻",
      session_date: "2026-03-20",
      total_points: 19,
      total_points_lost: 8,
      serve_aces: 3,
      serve_errors: 1,
      attack_kills: 13,
      attack_errors: 1,
      blocked_times: 1,
      reception_success_rate: 78,
      block_points: 3,
      digs: 8,
      clutch_performance_score: 82,
      error_tags: [],
      notes: "各方面表现均衡出色",
    },
    expected: {
      scoreRange: [85, 95],
      mustHaveTags: ["VB_SCORING_STRONG"],
      mustNotHaveTags: ["VB_ERROR_PRONE", "VB_CLUTCH_WEAK"],
      strengthsCount: [3, 4],
      weaknessesCount: [0, 1],
      subScoreExpectations: {
        scoring_contribution: [80, 95],
        error_control: [75, 95],
        stability: [75, 95],
        clutch_performance: [75, 95],
      },
      rationalityChecks: [
        {
          description: "所有子评分都应该高于75",
          check: (r) => {
            const scores = r.overview.sub_scores
            if (!scores) return false
            return scores.scoring_contribution >= 75 &&
                   scores.error_control >= 75 &&
                   scores.stability >= 75 &&
                   scores.clutch_performance >= 75
          },
        },
        {
          description: "优势应该显著多于问题",
          check: (r) => r.strengths.length >= 3 && r.weaknesses.length <= 1,
        },
      ],
    },
  },
  
  {
    id: "B009",
    name: "二传组织型",
    description: "不求得分专注组织",
    playerProfile: { position: "二传", style: "球队大脑" },
    input: {
      match_name: "vs 化工学院",
      opponent: "化工学院",
      player_position: "二传",
      session_date: "2026-03-20",
      total_points: 6,
      total_points_lost: 7,
      serve_aces: 1,
      serve_errors: 1,
      attack_kills: 3,
      attack_errors: 1,
      blocked_times: 1,
      reception_success_rate: 82,
      block_points: 1,
      digs: 12,
      clutch_performance_score: 74,
      error_tags: [],
      notes: "一传和防守优秀，组织调度稳定",
    },
    expected: {
      scoreRange: [72, 82],
      mustHaveTags: [],
      mustNotHaveTags: ["VB_SCORING_STRONG"], // 二传得分不应该被判强
      strengthsCount: [2, 3],
      weaknessesCount: [0, 1],
      subScoreExpectations: {
        stability: [75, 90],
        scoring_contribution: [35, 60], // 二传得分贡献应该较低
      },
      rationalityChecks: [
        {
          description: "稳定性应该最高",
          check: (r) => {
            const scores = r.overview.sub_scores
            if (!scores) return false
            return scores.stability >= scores.scoring_contribution &&
                   scores.stability >= scores.error_control &&
                   scores.stability >= scores.clutch_performance
          },
        },
      ],
    },
  },
  
  {
    id: "B010",
    name: "副攻拦网型",
    description: "网口防守核心",
    playerProfile: { position: "副攻", style: "网口统治" },
    input: {
      match_name: "vs 土木学院",
      opponent: "土木学院",
      player_position: "副攻",
      session_date: "2026-03-20",
      total_points: 12,
      total_points_lost: 9,
      serve_aces: 1,
      serve_errors: 2,
      attack_kills: 7,
      attack_errors: 2,
      blocked_times: 1,
      reception_success_rate: 60,
      block_points: 6,
      digs: 4,
      clutch_performance_score: 68,
      error_tags: [],
      notes: "拦网端表现突出，符合副攻定位",
    },
    expected: {
      scoreRange: [75, 85],
      mustHaveTags: ["VB_BLOCK_ACTIVE"],
      mustNotHaveTags: [],
      strengthsCount: [2, 3],
      weaknessesCount: [0, 2],
      subScoreExpectations: {
        scoring_contribution: [60, 80], // 副攻得分中等即可
      },
      rationalityChecks: [
        {
          description: "优势中应该提到拦网",
          check: (r) => r.strengths.some(s => s.title.includes("拦网")),
        },
      ],
    },
  },
]

// ============ 评估执行 ============

export interface TestResult {
  caseId: string
  caseName: string
  passed: boolean
  score: number
  scoreInRange: boolean
  tagsCorrect: boolean
  rationalityPassed: boolean
  failures: string[]
  details: {
    expectedScoreRange: [number, number]
    actualScore: number
    missingTags: string[]
    unexpectedTags: string[]
    failedChecks: string[]
  }
}

export function runEvaluationBenchmark(): TestResult[] {
  return evaluationBenchmarks.map(benchmark => {
    const report = analyzeVolleyball(benchmark.input)
    const failures: string[] = []
    
    // 检查分数区间
    const scoreInRange = report.overview.overall_score >= benchmark.expected.scoreRange[0] &&
                         report.overview.overall_score <= benchmark.expected.scoreRange[1]
    if (!scoreInRange) {
      failures.push(`总分 ${report.overview.overall_score} 不在预期区间 [${benchmark.expected.scoreRange[0]}, ${benchmark.expected.scoreRange[1]}]`)
    }
    
    // 检查必须标签
    const missingTags = benchmark.expected.mustHaveTags.filter(
      tag => !report.tags.includes(tag)
    )
    if (missingTags.length > 0) {
      failures.push(`缺少必须标签: ${missingTags.join(", ")}`)
    }
    
    // 检查禁止标签
    const unexpectedTags = benchmark.expected.mustNotHaveTags.filter(
      tag => report.tags.includes(tag)
    )
    if (unexpectedTags.length > 0) {
      failures.push(`出现不应有的标签: ${unexpectedTags.join(", ")}`)
    }
    
    // 检查数量
    if (report.strengths.length < benchmark.expected.strengthsCount[0] ||
        report.strengths.length > benchmark.expected.strengthsCount[1]) {
      failures.push(`优势数量 ${report.strengths.length} 不在预期范围 [${benchmark.expected.strengthsCount[0]}, ${benchmark.expected.strengthsCount[1]}]`)
    }
    
    if (report.weaknesses.length < benchmark.expected.weaknessesCount[0] ||
        report.weaknesses.length > benchmark.expected.weaknessesCount[1]) {
      failures.push(`问题数量 ${report.weaknesses.length} 不在预期范围 [${benchmark.expected.weaknessesCount[0]}, ${benchmark.expected.weaknessesCount[1]}]`)
    }
    
    // 检查子评分预期
    const subScores = report.overview.sub_scores
    if (subScores) {
      for (const [key, range] of Object.entries(benchmark.expected.subScoreExpectations)) {
        const score = subScores[key as keyof typeof subScores]
        if (score < range[0] || score > range[1]) {
          failures.push(`${key} ${score} 不在预期区间 [${range[0]}, ${range[1]}]`)
        }
      }
    }
    
    // 执行合理性检查
    const failedChecks: string[] = []
    for (const check of benchmark.expected.rationalityChecks) {
      if (!check.check(report)) {
        failedChecks.push(check.description)
        failures.push(`合理性检查失败: ${check.description}`)
      }
    }
    
    return {
      caseId: benchmark.id,
      caseName: benchmark.name,
      passed: failures.length === 0,
      score: report.overview.overall_score,
      scoreInRange,
      tagsCorrect: missingTags.length === 0 && unexpectedTags.length === 0,
      rationalityPassed: failedChecks.length === 0,
      failures,
      details: {
        expectedScoreRange: benchmark.expected.scoreRange,
        actualScore: report.overview.overall_score,
        missingTags,
        unexpectedTags,
        failedChecks,
      }
    }
  })
}

// 生成评估报告
export function generateEvaluationReport(results: TestResult[]): string {
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  let report = `\n========== 评估基准测试报告 ==========\n`
  report += `总计: ${results.length} 个测试用例\n`
  report += `通过: ${passed} | 失败: ${failed}\n`
  report += `通过率: ${((passed / results.length) * 100).toFixed(1)}%\n\n`
  
  if (failed > 0) {
    report += `失败详情:\n`
    results.filter(r => !r.passed).forEach(r => {
      report += `\n[${r.caseId}] ${r.caseName}\n`
      r.failures.forEach(f => {
        report += `  - ${f}\n`
      })
    })
  }
  
  report += `\n各用例分数:\n`
  results.forEach(r => {
    const status = r.passed ? "✓" : "✗"
    report += `${status} [${r.caseId}] ${r.caseName}: ${r.score}分\n`
  })
  
  report += `\n======================================\n`
  
  return report
}
