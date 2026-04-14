"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Download, Share2, Trash2 } from "lucide-react"
import type { ReportData } from "@/lib/report-engine"

export function ReportPageClient({ id }: { id: string }) {
  const router = useRouter()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(`report_${id}`)
    setReport(stored ? (JSON.parse(stored) as ReportData) : null)
    setLoading(false)
  }, [id])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0B0D12] text-[#7C7E84]">加载中...</div>
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0B0D12] px-4 py-10 text-[#F0F2F5]">
        <div className="mx-auto max-w-2xl text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#7C7E84]" />
          <h1 className="text-2xl font-semibold">报告不存在</h1>
          <p className="mt-2 text-[#7C7E84]">这份历史报告可能已被删除。</p>
          <Link href="/history" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-5 py-3 font-semibold text-[#0B0D12]">
            <ArrowLeft className="h-4 w-4" />
            返回历史记录
          </Link>
        </div>
      </div>
    )
  }

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `report-${report.athleteName}-${report.matchDate}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const deleteReport = () => {
    localStorage.removeItem(`report_${id}`)
    router.push("/history")
  }

  const shareReport = async () => {
    const text = `${report.athleteName} - ${report.matchName}\n总分：${report.overview.overallScore}\n结论：${report.overview.verdict}`
    if (navigator.share) {
      await navigator.share({ title: `${report.athleteName} 表现报告`, text })
      return
    }
    await navigator.clipboard.writeText(text)
    window.alert("报告摘要已复制")
  }

  return (
    <div className="min-h-screen bg-[#0B0D12] px-4 py-6 text-[#F0F2F5]">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/history" className="rounded-full p-2 transition-colors hover:bg-white/5">
              <ArrowLeft className="h-5 w-5 text-[#7C7E84]" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">{report.athleteName}</h1>
              <p className="text-sm text-[#7C7E84]">
                {report.matchName} · {report.matchDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportReport} className="rounded-full p-2 transition-colors hover:bg-white/5" title="导出">
              <Download className="h-5 w-5 text-[#7C7E84]" />
            </button>
            <button onClick={deleteReport} className="rounded-full p-2 transition-colors hover:bg-white/5" title="删除">
              <Trash2 className="h-5 w-5 text-[#FF6B6B]" />
            </button>
          </div>
        </header>

        <section className="rounded-3xl bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-[#7C7E84]">整体结论</p>
              <h2 className="mt-1 text-3xl font-bold">{report.overview.overallScore}</h2>
              <p className="mt-2 text-lg">{report.overview.verdict}</p>
              <p className="mt-2 text-sm text-[#7C7E84]">{report.overview.summary}</p>
            </div>
            <button onClick={shareReport} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#CCFF00] px-5 py-3 font-semibold text-[#0B0D12]">
              <Share2 className="h-4 w-4" />
              分享摘要
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <ScoreCard label="得分贡献" value={report.subScores.scoring} />
          <ScoreCard label="失误控制" value={report.subScores.errorControl} />
          <ScoreCard label="稳定性" value={report.subScores.stability} />
          <ScoreCard label="关键分" value={report.subScores.clutch} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ListCard title="优势" items={report.strengths} accent="text-[#CCFF00]" />
          <ListCard title="问题" items={report.weaknesses} accent="text-[#FF6B6B]" />
        </section>

        <section className="rounded-3xl bg-white/5 p-6">
          <h3 className="text-lg font-semibold">训练建议</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PriorityColumn title="高优先级" items={report.recommendations.highPriority} />
            <PriorityColumn title="中优先级" items={report.recommendations.mediumPriority} />
            <PriorityColumn title="低优先级" items={report.recommendations.lowPriority} />
          </div>
        </section>
      </div>
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl bg-white/5 p-4">
      <div className="text-sm text-[#7C7E84]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </article>
  )
}

function ListCard({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <section className="rounded-3xl bg-white/5 p-6">
      <h3 className={`text-lg font-semibold ${accent}`}>{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="text-sm text-[#7C7E84]">暂无。</p> : null}
        {items.map((item, index) => (
          <p key={`${title}-${index}`} className="text-sm text-[#F0F2F5]">
            {item}
          </p>
        ))}
      </div>
    </section>
  )
}

function PriorityColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-black/20 p-4">
      <div className="text-sm font-semibold text-[#CCFF00]">{title}</div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-[#7C7E84]">暂无。</p> : null}
        {items.map((item, index) => (
          <p key={`${title}-${index}`} className="text-sm text-[#F0F2F5]">
            {item}
          </p>
        ))}
      </div>
    </div>
  )
}
