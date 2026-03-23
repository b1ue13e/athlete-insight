"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, TrendingUp, Award, Target, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReportData } from "@/lib/report-engine"
import { generateAthleteBaseline, generateBaselineInsights, generateComparisonStatements } from "@/lib/athlete-baseline"
import { generatePrescriptions } from "@/lib/training-prescription"
import { AthleteBaseline } from "@/lib/athlete-baseline"
import { SharePanel } from "@/components/report/share-panel"
import { PrescriptionHistory, PrescriptionFeedbackHint } from "@/components/report/prescription-history"

export default function ReportV2Page() {
  const params = useParams()
  const [report, setReport] = useState<ReportData | null>(null)
  const [baseline, setBaseline] = useState<AthleteBaseline | null>(null)
  const [insights, setInsights] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = params.id as string
    const stored = localStorage.getItem(`report_${id}`)
    
    if (stored) {
      const parsed = JSON.parse(stored)
      setReport(parsed)
      const bl = generateAthleteBaseline(parsed.athleteId, parsed.athleteName, parsed)
      setBaseline(bl)
      setInsights(generateBaselineInsights(bl, parsed))
    }
    setIsLoading(false)
  }, [params.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">加载中...</div>
      </div>
    )
  }

  if (!report || !baseline) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-4">报告不存在</p>
          <Link href="/" className="text-[var(--accent)]">返回首页</Link>
        </div>
      </div>
    )
  }

  const prescriptions = generatePrescriptions(report.weaknesses, report.errorTags, report.position)
  const comparisons = generateComparisonStatements(baseline, report)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-secondary)]">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </Link>
          <div className="text-sm text-[var(--text-primary)]">{report.athleteName} · {report.position}</div>
        </div>
      </nav>

      <main className="pt-14">
        {/* Hero */}
        <section className="pt-16 pb-8 px-6">
          <div className="max-w-7xl mx-auto">
            {insights.length > 0 && (
              <div className="mb-8 p-4 border-l-4 border-[var(--accent)] bg-[var(--accent)]/5">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-[var(--accent)] mt-0.5" />
                  <div className="space-y-1">
                    {insights.slice(0, 2).map((insight, i) => (
                      <p key={i} className="text-[var(--text-primary)]">{insight}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div>
                <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-2">{report.matchName}</div>
                <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-2">{report.overview.verdict}</h1>
                <p className="text-[var(--text-secondary)]">{report.position} · {new Date(report.createdAt).toLocaleDateString("zh-CN")}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <div className={cn("text-[120px] font-bold leading-none", report.overview.overallScore >= 70 ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
                  {report.overview.overallScore}
                </div>
                <div className="text-[var(--text-muted)] text-sm">综合<br/>评分</div>
              </div>
            </div>
          </div>
        </section>

        {/* 基线对比 */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-6">
              <TrendingUp className="w-5 h-5" />
              <h2 className="text-lg font-bold">与基线对比</h2>
              <span className="text-xs text-[var(--text-muted)] ml-2">基于近{baseline.seasonStats.totalGames}场</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {comparisons.map((comp, i) => (
                <div key={i} className={cn("p-4 border", 
                  comp.type === "positive" ? "border-[var(--accent)]/30 bg-[var(--accent)]/5" :
                  comp.type === "negative" ? "border-[var(--negative)]/30 bg-[var(--negative)]/5" :
                  "border-[var(--line-default)]"
                )}>
                  <div className={cn("text-sm",
                    comp.type === "positive" ? "text-[var(--accent)]" :
                    comp.type === "negative" ? "text-[var(--negative)]" :
                    "text-[var(--text-secondary)]"
                  )}>{comp.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-4 gap-4">
              <StatBox label="赛季平均" value={baseline.seasonStats.averageScore} />
              <StatBox label="中位水平" value={baseline.seasonStats.medianScore} />
              <StatBox label="最佳表现" value={baseline.seasonStats.bestScore} highlight />
              <StatBox label="波动程度" value={`±${baseline.seasonStats.stdDeviation}`} />
            </div>
          </div>
        </section>

        {/* 维度得分 */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-6">维度分析</h2>
            <DimensionStrip label="得分贡献" score={report.subScores.scoring} baseline={baseline.dimensionBaselines.find(b => b.dimension === "scoring")} />
            <DimensionStrip label="失误控制" score={report.subScores.errorControl} baseline={baseline.dimensionBaselines.find(b => b.dimension === "errorControl")} />
            <DimensionStrip label="稳定性" score={report.subScores.stability} baseline={baseline.dimensionBaselines.find(b => b.dimension === "stability")} />
            <DimensionStrip label="关键分" score={report.subScores.clutch} baseline={baseline.dimensionBaselines.find(b => b.dimension === "clutch")} isLast />
          </div>
        </section>

        {/* 训练处方 */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-6">
              <Target className="w-5 h-5" />
              <h2 className="text-lg font-bold">训练处方</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prescriptions.map((p, i) => (
                <div key={i} className="p-4 border border-[var(--line-default)]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-[var(--accent)]">{p.category}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5",
                      p.execution.intensity === "high" ? "bg-[var(--negative)]/20 text-[var(--negative)]" :
                      p.execution.intensity === "medium" ? "bg-[var(--warning)]/20 text-[var(--warning)]" :
                      "bg-[var(--info)]/20 text-[var(--info)]"
                    )}>{p.execution.intensity === "high" ? "高" : p.execution.intensity === "medium" ? "中" : "低"}强度</span>
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-2">{p.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{p.description}</p>
                  <div className="text-xs text-[var(--text-muted)] space-y-1">
                    <div>{p.execution.duration} · {p.execution.sets}组×{p.execution.reps}</div>
                    <div className="text-[var(--accent)]">达标：{p.successCriteria}</div>
                  </div>
                  <PrescriptionFeedbackHint 
                    prescriptionId={`prescription_${report.id}_${i}`}
                    athleteId={report.athleteId}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 分享按钮（固定在右下角） */}
      {report && baseline && (
        <SharePanel report={report} baseline={baseline} insights={insights} />
      )}

      {/* 优势与问题 */}
        <section className="px-6 pb-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="border border-[var(--line-default)]">
                <div className="p-4 border-b border-[var(--line-default)]">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">STRENGTHS</div>
                </div>
                <ul className="p-4 space-y-3">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[var(--text-primary)]"><span className="text-[var(--accent)]">+</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-[var(--line-default)]">
                <div className="p-4 border-b border-[var(--line-default)]">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--negative)]">WEAKNESSES</div>
                </div>
                <ul className="p-4 space-y-3">
                  {report.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-3 text-[var(--text-primary)]"><span className="text-[var(--negative)]">−</span>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="p-4 border border-[var(--line-default)] text-center">
      <div className={cn("text-2xl font-bold", highlight ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
    </div>
  )
}

function DimensionStrip({ label, score, baseline, isLast }: { label: string; score: number; baseline?: any; isLast?: boolean }) {
  const diff = baseline ? score - baseline.seasonAvg : 0
  return (
    <div className={cn("py-6 flex items-center gap-6", !isLast && "border-b border-[var(--line-default)]")}>
      <div className="w-24 shrink-0">
        <div className="text-sm text-[var(--text-primary)]">{label}</div>
        {baseline && (
          <div className={cn("text-xs", diff > 0 ? "text-[var(--accent)]" : diff < 0 ? "text-[var(--negative)]" : "text-[var(--text-muted)]")}>
            {diff > 0 ? "+" : ""}{diff} vs 均值
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="h-2 bg-[var(--bg-tertiary)] relative">
          {baseline && <div className="absolute h-full w-0.5 bg-[var(--text-muted)]" style={{ left: `${baseline.seasonAvg}%` }} />}
          <div className={cn("h-full", score >= 70 ? "bg-[var(--accent)]" : score >= 50 ? "bg-[var(--info)]" : "bg-[var(--negative)]")} style={{ width: `${score}%` }} />
        </div>
      </div>
      <div className="w-16 text-right">
        <span className={cn("text-2xl font-bold", score >= 70 ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{score}</span>
      </div>
    </div>
  )
}
