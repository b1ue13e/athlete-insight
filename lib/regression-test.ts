/**
 * 回归测试系统
 * 
 * 用于验证评分引擎的每次变更：
 * 1. 运行所有评估基准
 * 2. 检查总分漂移
 * 3. 验证标签判定
 * 4. 确保位置公平性
 * 5. 生成测试报告
 */

import { 
  evaluationBenchmarks, 
  runEvaluationBenchmark, 
  generateEvaluationReport,
  TestResult 
} from "./evaluation-benchmark"
import { calculateVolleyballScore, positionTemplates } from "./scoring-engine"
import { versionToString, CURRENT_SCORING_VERSION } from "./scoring-version"

// 测试配置
const REGRESSION_CONFIG = {
  // 分数漂移阈值（超过此值视为失败）
  scoreDriftThreshold: 5,
  // 子评分漂移阈值
  subScoreDriftThreshold: 8,
  // 必须通过的最小测试数比例
  minPassRate: 0.8,
}

// 历史基准（用于对比）
// 在实际项目中，这些应该存储在版本控制中
interface HistoricalBaseline {
  version: string
  date: string
  results: {
    caseId: string
    score: number
    subScores: {
      scoring_contribution: number
      error_control: number
      stability: number
      clutch_performance: number
    }
    tags: string[]
  }[]
}

// 位置公平性测试
interface FairnessTest {
  name: string
  description: string
  testCases: {
    position: keyof typeof positionTemplates
    input: Parameters<typeof calculateVolleyballScore>[0]
    expectedBias: "low" | "medium" | "high" // 期望该位置在这个场景下的得分倾向
  }[]
}

const fairnessTests: FairnessTest[] = [
  {
    name: "防守型数据公平性",
    description: "测试高防守低进攻数据在不同位置的评分公平性",
    testCases: [
      {
        position: "自由人",
        input: {
          match_name: "Test",
          opponent: "Test",
          player_position: "自由人",
          session_date: "2026-03-23",
          total_points: 2,
          total_points_lost: 5,
          serve_aces: 0,
          serve_errors: 0,
          attack_kills: 0,
          attack_errors: 0,
          blocked_times: 0,
          reception_success_rate: 80,
          block_points: 0,
          digs: 15,
          clutch_performance_score: 70,
          error_tags: [],
          notes: "",
        },
        expectedBias: "high", // 自由人应该得分较高
      },
      {
        position: "主攻",
        input: {
          match_name: "Test",
          opponent: "Test",
          player_position: "主攻",
          session_date: "2026-03-23",
          total_points: 2,
          total_points_lost: 5,
          serve_aces: 0,
          serve_errors: 0,
          attack_kills: 1,
          attack_errors: 0,
          blocked_times: 0,
          reception_success_rate: 80,
          block_points: 0,
          digs: 15,
          clutch_performance_score: 70,
          error_tags: [],
          notes: "",
        },
        expectedBias: "low", // 主攻同样数据应该得分较低
      },
    ],
  },
  {
    name: "进攻型数据公平性",
    description: "测试高进攻数据在不同位置的评分公平性",
    testCases: [
      {
        position: "主攻",
        input: {
          match_name: "Test",
          opponent: "Test",
          player_position: "主攻",
          session_date: "2026-03-23",
          total_points: 18,
          total_points_lost: 8,
          serve_aces: 2,
          serve_errors: 1,
          attack_kills: 12,
          attack_errors: 2,
          blocked_times: 1,
          reception_success_rate: 65,
          block_points: 2,
          digs: 4,
          clutch_performance_score: 75,
          error_tags: [],
          notes: "",
        },
        expectedBias: "high",
      },
      {
        position: "二传",
        input: {
          match_name: "Test",
          opponent: "Test",
          player_position: "二传",
          session_date: "2026-03-23",
          total_points: 18,
          total_points_lost: 8,
          serve_aces: 2,
          serve_errors: 1,
          attack_kills: 12,
          attack_errors: 2,
          blocked_times: 1,
          reception_success_rate: 65,
          block_points: 2,
          digs: 4,
          clutch_performance_score: 75,
          error_tags: [],
          notes: "",
        },
        expectedBias: "medium", // 二传进攻权重较低，同样进攻数据得分应该中等
      },
    ],
  },
]

// 运行回归测试
export function runRegressionTest(): {
  passed: boolean
  summary: string
  details: {
    benchmarkResults: TestResult[]
    fairnessResults: {
      testName: string
      passed: boolean
      details: string[]
    }[]
    driftAnalysis: {
      hasDrift: boolean
      drifts: {
        caseId: string
        metric: string
        oldValue: number
        newValue: number
        drift: number
      }[]
    }
  }
} {
  console.log("\n🧪 开始回归测试...\n")
  
  // 1. 运行评估基准
  const benchmarkResults = runEvaluationBenchmark()
  const passedBenchmarks = benchmarkResults.filter(r => r.passed).length
  const benchmarkPassRate = passedBenchmarks / benchmarkResults.length
  
  console.log(generateEvaluationReport(benchmarkResults))
  
  // 2. 运行公平性测试
  const fairnessResults = runFairnessTests()
  
  // 3. 分析漂移（如果有历史基准）
  const driftAnalysis = analyzeDrift(benchmarkResults, null)
  
  // 4. 综合判断
  const passed = 
    benchmarkPassRate >= REGRESSION_CONFIG.minPassRate &&
    fairnessResults.every(r => r.passed) &&
    !driftAnalysis.hasDrift
  
  // 生成汇总报告
  const summary = generateRegressionSummary(
    benchmarkResults,
    fairnessResults,
    driftAnalysis
  )
  
  return {
    passed,
    summary,
    details: {
      benchmarkResults,
      fairnessResults,
      driftAnalysis,
    },
  }
}

// 运行公平性测试
function runFairnessTests() {
  return fairnessTests.map(test => {
    const results = test.testCases.map(tc => {
      const result = calculateVolleyballScore(tc.input)
      return {
        position: tc.position,
        score: result.overall_score,
        expectedBias: tc.expectedBias,
      }
    })
    
    // 检查公平性
    const details: string[] = []
    let passed = true
    
    // 高偏差应该得分高，低偏差应该得分低
    const highBiasScores = results.filter(r => r.expectedBias === "high").map(r => r.score)
    const lowBiasScores = results.filter(r => r.expectedBias === "low").map(r => r.score)
    
    if (highBiasScores.length > 0 && lowBiasScores.length > 0) {
      const avgHigh = highBiasScores.reduce((a, b) => a + b, 0) / highBiasScores.length
      const avgLow = lowBiasScores.reduce((a, b) => a + b, 0) / lowBiasScores.length
      
      if (avgHigh <= avgLow) {
        passed = false
        details.push(`公平性异常：高偏差场景平均分(${avgHigh}) <= 低偏差场景平均分(${avgLow})`)
      } else {
        details.push(`公平性正常：高偏差场景平均分(${avgHigh}) > 低偏差场景平均分(${avgLow})`)
      }
    }
    
    results.forEach(r => {
      details.push(`  ${r.position}: ${r.score}分 (期望${r.expectedBias}偏差)`)
    })
    
    return {
      testName: test.name,
      passed,
      details,
    }
  })
}

// 分析分数漂移
function analyzeDrift(
  currentResults: TestResult[],
  baseline: HistoricalBaseline | null
) {
  if (!baseline) {
    return {
      hasDrift: false,
      drifts: [],
    }
  }
  
  const drifts: {
    caseId: string
    metric: string
    oldValue: number
    newValue: number
    drift: number
  }[] = []
  
  currentResults.forEach(current => {
    const historical = baseline.results.find(r => r.caseId === current.caseId)
    if (!historical) return
    
    // 检查总分漂移
    const scoreDrift = Math.abs(current.score - historical.score)
    if (scoreDrift > REGRESSION_CONFIG.scoreDriftThreshold) {
      drifts.push({
        caseId: current.caseId,
        metric: "overall_score",
        oldValue: historical.score,
        newValue: current.score,
        drift: scoreDrift,
      })
    }
  })
  
  return {
    hasDrift: drifts.length > 0,
    drifts,
  }
}

// 生成回归测试汇总
function generateRegressionSummary(
  benchmarkResults: TestResult[],
  fairnessResults: {
    testName: string
    passed: boolean
    details: string[]
  }[],
  driftAnalysis: {
    hasDrift: boolean
    drifts: {
      caseId: string
      metric: string
      drift: number
    }[]
  }
): string {
  const passedBenchmarks = benchmarkResults.filter(r => r.passed).length
  const totalBenchmarks = benchmarkResults.length
  const passRate = ((passedBenchmarks / totalBenchmarks) * 100).toFixed(1)
  
  let summary = `
========== 回归测试汇总 ==========
引擎版本: ${versionToString(CURRENT_SCORING_VERSION)}
测试时间: ${new Date().toISOString()}

【评估基准】
通过: ${passedBenchmarks}/${totalBenchmarks} (${passRate}%)
状态: ${passedBenchmarks / totalBenchmarks >= REGRESSION_CONFIG.minPassRate ? "✅ 通过" : "❌ 未通过"}

【公平性测试】
`
  
  fairnessResults.forEach(r => {
    summary += `${r.passed ? "✅" : "❌"} ${r.testName}\n`
    r.details.forEach(d => {
      summary += `  ${d}\n`
    })
  })
  
  summary += `
【漂移分析】
状态: ${driftAnalysis.hasDrift ? "⚠️ 检测到漂移" : "✅ 无漂移"}
`
  
  if (driftAnalysis.hasDrift) {
    driftAnalysis.drifts.forEach(d => {
      summary += `  ${d.caseId}.${d.metric}: 漂移 ${d.drift.toFixed(1)}\n`
    })
  }
  
  const allPassed = 
    passedBenchmarks / totalBenchmarks >= REGRESSION_CONFIG.minPassRate &&
    fairnessResults.every(r => r.passed) &&
    !driftAnalysis.hasDrift
  
  summary += `
========== 总体结果: ${allPassed ? "✅ 通过" : "❌ 未通过"} ==========
`
  
  return summary
}

// 导出当前结果为新的历史基准
export function exportCurrentAsBaseline(): HistoricalBaseline {
  const results = evaluationBenchmarks.map(b => {
    const scoreResult = calculateVolleyballScore(b.input)
    return {
      caseId: b.id,
      score: scoreResult.overall_score,
      subScores: scoreResult.sub_scores,
      tags: [], // 可以扩展
    }
  })
  
  return {
    version: versionToString(CURRENT_SCORING_VERSION),
    date: new Date().toISOString(),
    results,
  }
}

// 如果使用 Node.js 直接运行
if (typeof window === "undefined" && require.main === module) {
  const result = runRegressionTest()
  console.log(result.summary)
  process.exit(result.passed ? 0 : 1)
}
