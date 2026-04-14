"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Share2, TrendingUp } from "lucide-react"
import type { ReportData } from "@/lib/report-engine"
import { generateAthleteBaseline, generateBaselineInsights, generateComparisonStatements } from "@/lib/athlete-baseline"
import { generatePrescriptions } from "@/lib/training-prescription"

export function ReportV2PageClient({ id }: { id: string }) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(`report_${id}`)
    setReport(stored ? (JSON.parse(stored) as ReportData) : null)
    setLoading(false)
  }, [id])

  const baseline = useMemo(
    () => (report ? generateAthleteBaseline(report.athleteId, report.athleteName, report) : null),
    [report]
  )
  const insights = useMemo(() => (baseline && report ? generateBaselineInsights(baseline, report) : []), [baseline, report])
  const comparisons = useMemo(() => (baseline && report ? generateComparisonStatements(baseline, report) : []), [baseline, report])
  const prescriptions = useMemo(
    () => (report ? generatePrescriptions(report.weaknesses, report.errorTags, report.position) : []),
    [report]
  )

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] text-[#7C7E84]">加载中...</div>
  }

  if (!report || !baseline) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] px-4 text-[#F0F2F5]">
        <div className="text-center">
          <p className="text-lg">报告不存在</p>
          <Link href="/history" className="mt-4 inline-flex items-center gap-2 text-[#CCFF00]">
            <ArrowLeft className="h-4 w-4" />
            返回历史记录
          </Link>
        </div>
      </div>
    )
  }

  const shareText = `${report.athleteName} 深度分析\n总分：${report.overview.overallScore}\n${report.overview.verdict}`

  return (
    <div className="min-h-screen bg-[#0B0D12] px-4 py-6 text-[#F0F2F5]">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/history" className="rounded-full p-2 transition-colors hover:bg-white/5">
              <ArrowLeft className="h-5 w-5 text-[#7C7E84]" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">{report.athleteName} 深度分析</h1>
              <p className="text-sm text-[#7C7E84]">{report.matchName}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({ title: `${report.athleteName} 深度分析`, text: shareText })
              } else {
                await navigator.clipboard.writeText(shareText)
                window.alert("摘要已复制")
              }
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-4 py-2 font-medium text-[#0B0D12]"
          >
            <Share2 className="h-4 w-4" />
            分享
          </button>
        </header>

        <section className="rounded-3xl bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-[#CCFF00]" />
            <h2 className="text-lg font-semibold">个人基线对比</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {comparisons.map((item, index) => (
              <div key={index} className="rounded-2xl bg-black/20 px-4 py-3 text-sm text-[#F0F2F5]">
                {item.text}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white/5 p-6">
          <h2 className="text-lg font-semibold">洞察</h2>
          <div className="mt-4 space-y-3">
            {insights.map((item, index) => (
              <p key={index} className="text-sm text-[#F0F2F5]">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white/5 p-6">
          <h2 className="text-lg font-semibold">训练处方</h2>
          <div className="mt-4 space-y-4">
            {prescriptions.map((item) => (
              <article key={item.id} className="rounded-2xl bg-black/20 p-4">
                <div className="text-sm text-[#7C7E84]">{item.category}</div>
                <div className="mt-1 text-lg font-semibold">{item.title}</div>
                <p className="mt-2 text-sm text-[#F0F2F5]">{item.description}</p>
                <p className="mt-2 text-sm text-[#CCFF00]">{item.successCriteria}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
