"use client"

import { useState, useEffect } from "react"
import { 
  getAllGoldStandard, 
  exportGoldStandardData,
  generateCoachBlindTestForm,
  type GoldStandardEntry 
} from "@/lib/gold-standard"
import { 
  generateValidationReport, 
  exportValidationReport,
  type ValidationReport 
} from "@/lib/validation"
import { 
  analyzeShadowResults, 
  exportShadowData,
  type ShadowAnalysis 
} from "@/lib/shadow-scoring"

export default function ValidationDashboard() {
  const [goldStandardData, setGoldStandardData] = useState<GoldStandardEntry[]>([])
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [shadowAnalysis, setShadowAnalysis] = useState<ShadowAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "gold-standard" | "statistics" | "shadow">("overview")

  useEffect(() => {
    const data = getAllGoldStandard()
    setGoldStandardData(data)
    
    if (data.length > 0) {
      setValidationReport(generateValidationReport(data))
    }
    
    setShadowAnalysis(analyzeShadowResults())
  }, [])

  const exportAllData = () => {
    const goldStandard = exportGoldStandardData()
    const shadow = exportShadowData()
    
    const fullExport = {
      exportDate: new Date().toISOString(),
      goldStandard: JSON.parse(goldStandard),
      shadowScores: JSON.parse(shadow),
      validationReport
    }
    
    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `validation-data-${new Date().toISOString().split("T")[0]}.json`
    a.click()
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--line-default)]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">V2 引擎验证仪表板</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                影子测试 · 金标准对比 · 统计学验证
              </p>
            </div>
            <button
              onClick={exportAllData}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg font-medium"
            >
              导出全部数据
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-[var(--line-default)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { key: "overview", label: "总览" },
              { key: "gold-standard", label: "金标准数据" },
              { key: "statistics", label: "统计学验证" },
              { key: "shadow", label: "影子测试" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "overview" && (
          <OverviewTab 
            goldStandardCount={goldStandardData.length}
            validationReport={validationReport}
            shadowAnalysis={shadowAnalysis}
          />
        )}
        
        {activeTab === "gold-standard" && (
          <GoldStandardTab data={goldStandardData} />
        )}
        
        {activeTab === "statistics" && validationReport && (
          <StatisticsTab report={validationReport} />
        )}
        
        {activeTab === "shadow" && shadowAnalysis && (
          <ShadowTab analysis={shadowAnalysis} />
        )}
      </main>
    </div>
  )
}

// ============ 总览标签 ============

function OverviewTab({ 
  goldStandardCount,
  validationReport,
  shadowAnalysis
}: {
  goldStandardCount: number
  validationReport: ValidationReport | null
  shadowAnalysis: ShadowAnalysis | null
}) {
  const v2Passed = validationReport?.conclusion.v2Passed
  const spearman = validationReport?.v2.spearman.coefficient
  const coverage = validationReport?.v2.coverage.coverageRate

  return (
    <div className="space-y-6">
      {/* 关键指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="金标准样本"
          value={goldStandardCount}
          target="≥ 20"
          status={goldStandardCount >= 20 ? "good" : goldStandardCount >= 10 ? "warning" : "bad"}
        />
        <MetricCard
          title="斯皮尔曼系数"
          value={spearman ? spearman.toFixed(3) : "--"}
          target="> 0.8"
          status={spearman && spearman > 0.8 ? "good" : spearman && spearman > 0.6 ? "warning" : "bad"}
        />
        <MetricCard
          title="置信区间覆盖率"
          value={coverage ? `${coverage.toFixed(1)}%` : "--"}
          target="> 80%"
          status={coverage && coverage >= 80 ? "good" : coverage && coverage >= 70 ? "warning" : "bad"}
        />
        <MetricCard
          title="V2引擎状态"
          value={v2Passed === undefined ? "--" : v2Passed ? "通过" : "未通过"}
          status={v2Passed === undefined ? "neutral" : v2Passed ? "good" : "bad"}
        />
      </div>

      {/* 验证进度 */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">验证进度</h2>
        <div className="space-y-4">
          <ProgressStep
            number={1}
            title="影子测试环境"
            description="V1/V2 并行运行，数据双写"
            status="completed"
          />
          <ProgressStep
            number={2}
            title="金标准数据采集"
            description="20-30份教练盲测标注"
            status={goldStandardCount >= 20 ? "completed" : goldStandardCount >= 10 ? "in-progress" : "pending"}
          />
          <ProgressStep
            number={3}
            title="统计学验证"
            description="斯皮尔曼 > 0.8，覆盖率 > 80%"
            status={v2Passed ? "completed" : spearman ? "in-progress" : "pending"}
          />
          <ProgressStep
            number={4}
            title="AI幻觉评估"
            description="可执行性评分 > 3/5"
            status="pending"
          />
        </div>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href="/validation/coach-form"
          className="block p-6 bg-[var(--bg-secondary)] rounded-xl hover:bg-[var(--bg-secondary)]/80 transition-colors"
        >
          <div className="text-2xl mb-2">📝</div>
          <h3 className="font-bold">教练盲测表</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">为校队比赛生成盲测表单</p>
        </a>
        <a
          href="/validation/ai-eval"
          className="block p-6 bg-[var(--bg-secondary)] rounded-xl hover:bg-[var(--bg-secondary)]/80 transition-colors"
        >
          <div className="text-2xl mb-2">🤖</div>
          <h3 className="font-bold">AI 评估矩阵</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">评估 AI 洞察的可执行性</p>
        </a>
      </div>
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  target,
  status 
}: { 
  title: string
  value: string | number
  target?: string
  status: "good" | "warning" | "bad" | "neutral"
}) {
  const statusColors = {
    good: "bg-green-500/10 border-green-500/30",
    warning: "bg-yellow-500/10 border-yellow-500/30",
    bad: "bg-red-500/10 border-red-500/30",
    neutral: "bg-[var(--bg-secondary)] border-[var(--line-default)]"
  }

  return (
    <div className={`p-4 rounded-xl border ${statusColors[status]}`}>
      <div className="text-sm text-[var(--text-muted)]">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {target ? <div className="text-xs text-[var(--text-muted)] mt-1">目标: {target}</div> : null}
    </div>
  )
}

function ProgressStep({ 
  number, 
  title, 
  description, 
  status 
}: { 
  number: number
  title: string
  description: string
  status: "completed" | "in-progress" | "pending"
}) {
  const statusIcons = {
    completed: "✅",
    "in-progress": "🔄",
    pending: "⏳"
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          <span>{statusIcons[status]}</span>
        </div>
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  )
}

// ============ 金标准数据标签 ============

function GoldStandardTab({ data }: { data: GoldStandardEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium">暂无金标准数据</h3>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          请先使用教练盲测表收集数据
        </p>
        <a
          href="/validation/coach-form"
          className="inline-block mt-4 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg"
        >
          生成盲测表
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">已采集数据 ({data.length} 条)</h2>
        <button
          onClick={() => {
            const blob = new Blob([exportGoldStandardData()], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `gold-standard-${new Date().toISOString().split("T")[0]}.json`
            a.click()
          }}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          导出 JSON
        </button>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-primary)]/50">
            <tr>
              <th className="px-4 py-3 text-left">比赛</th>
              <th className="px-4 py-3 text-left">球员</th>
              <th className="px-4 py-3 text-left">教练评分</th>
              <th className="px-4 py-3 text-left">V1评分</th>
              <th className="px-4 py-3 text-left">V2评分</th>
              <th className="px-4 py-3 text-left">差距</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-default)]">
            {data.map((entry, i) => {
              const gap = entry.systemScores.v2.overallScore - entry.coachEvaluation.absoluteScore
              return (
                <tr key={i}>
                  <td className="px-4 py-3">{entry.matchName}</td>
                  <td className="px-4 py-3">{entry.playerName}</td>
                  <td className="px-4 py-3 font-medium">{entry.coachEvaluation.absoluteScore}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{entry.systemScores.v1.overallScore}</td>
                  <td className="px-4 py-3">{entry.systemScores.v2.overallScore}</td>
                  <td className={`px-4 py-3 ${Math.abs(gap) > 10 ? "text-red-500" : Math.abs(gap) > 5 ? "text-yellow-500" : "text-green-500"}`}>
                    {gap > 0 ? "+" : ""}{gap}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============ 统计学验证标签 ============

function StatisticsTab({ report }: { report: ValidationReport }) {
  return (
    <div className="space-y-6">
      {/* 验证结果摘要 */}
      <div className={`p-6 rounded-xl border ${report.conclusion.v2Passed ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{report.conclusion.v2Passed ? "✅" : "❌"}</span>
          <div>
            <h2 className="text-xl font-bold">
              V2引擎{report.conclusion.v2Passed ? "通过" : "未通过"}验证
            </h2>
            <p className="text-[var(--text-muted)]">{report.conclusion.recommendation}</p>
          </div>
        </div>
      </div>

      {/* 斯皮尔曼系数 */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
        <h3 className="font-bold mb-4">1. 排名相关性检验 (斯皮尔曼系数)</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-[var(--bg-primary)]/50 rounded-lg">
            <div className="text-sm text-[var(--text-muted)]">V1 引擎</div>
            <div className="text-2xl font-bold">{report.v1.spearman.coefficient.toFixed(3)}</div>
            <div className="text-xs text-[var(--text-muted)]">{report.v1.spearman.interpretation}</div>
          </div>
          <div className="p-4 bg-[var(--bg-primary)]/50 rounded-lg">
            <div className="text-sm text-[var(--text-muted)]">V2 引擎</div>
            <div className={`text-2xl font-bold ${report.v2.spearman.passed ? "text-green-500" : "text-red-500"}`}>
              {report.v2.spearman.coefficient.toFixed(3)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{report.v2.spearman.interpretation}</div>
          </div>
          <div className="p-4 bg-[var(--bg-primary)]/50 rounded-lg">
            <div className="text-sm text-[var(--text-muted)]">改进</div>
            <div className={`text-2xl font-bold ${report.v2.improvement.spearmanDelta > 0 ? "text-green-500" : "text-red-500"}`}>
              {report.v2.improvement.spearmanDelta > 0 ? "+" : ""}{report.v2.improvement.spearmanDelta.toFixed(3)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">目标: &gt; 0.8</div>
          </div>
        </div>
      </div>

      {/* 置信区间覆盖率 */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
        <h3 className="font-bold mb-4">2. 置信区间覆盖率检验</h3>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className={`text-4xl font-bold ${report.v2.coverage.passed ? "text-green-500" : "text-red-500"}`}>
              {report.v2.coverage.coverageRate.toFixed(1)}%
            </div>
            <div className="text-sm text-[var(--text-muted)]">实际覆盖率</div>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${report.v2.coverage.passed ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(100, report.v2.coverage.coverageRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
              <span>0%</span>
              <span>目标: 80%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-4">{report.v2.coverage.interpretation}</p>
      </div>

      {/* 导出完整报告 */}
      <button
        onClick={() => {
          const reportText = exportValidationReport(report)
          const blob = new Blob([reportText], { type: "text/markdown" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `validation-report-${new Date().toISOString().split("T")[0]}.md`
          a.click()
        }}
        className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-medium"
      >
        导出完整验证报告 (Markdown)
      </button>
    </div>
  )
}

// ============ 影子测试标签 ============

function ShadowTab({ analysis }: { analysis: ShadowAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
          <div className="text-sm text-[var(--text-muted)]">总对比次数</div>
          <div className="text-2xl font-bold">{analysis.totalComparisons}</div>
        </div>
        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
          <div className="text-sm text-[var(--text-muted)]">平均差异</div>
          <div className={`text-2xl font-bold ${Math.abs(analysis.avgOverallDelta) < 5 ? "text-green-500" : "text-yellow-500"}`}>
            {analysis.avgOverallDelta > 0 ? "+" : ""}{analysis.avgOverallDelta}
          </div>
        </div>
        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
          <div className="text-sm text-[var(--text-muted)]">V2更高</div>
          <div className="text-2xl font-bold">{analysis.scoreDistribution.v2Higher}</div>
        </div>
        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl">
          <div className="text-sm text-[var(--text-muted)]">差异&gt;10分</div>
          <div className={`text-2xl font-bold ${analysis.largeDiffCases.length === 0 ? "text-green-500" : "text-red-500"}`}>
            {analysis.largeDiffCases.length}
          </div>
        </div>
      </div>

      {analysis.largeDiffCases.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <h3 className="font-bold text-red-500 mb-4">⚠️ 差异过大案例 (需审查)</h3>
          <div className="space-y-2">
            {analysis.largeDiffCases.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{c.input.raw.match_name}</span>
                <span className="text-[var(--text-muted)] ml-2">V1: {c.v1.overallScore} → V2: {c.v2.overallScore}</span>
                <span className="text-red-500 ml-2">(差异: {c.diff.overallDelta > 0 ? "+" : ""}{c.diff.overallDelta})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
