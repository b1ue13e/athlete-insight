"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ChevronRight, FileText, Trophy, User } from "lucide-react"
import { AthleteProfile, AthleteReportSummary, getAthleteById, getAthleteReports, getAthleteStats } from "@/lib/athletes"
import { cn } from "@/lib/utils"

export function AthleteDetailPageClient({ id }: { id: string }) {
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null)
  const [reports, setReports] = useState<AthleteReportSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setAthlete(getAthleteById(id))
    setReports(
      getAthleteReports(id)
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    )
    setLoading(false)
  }, [id])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-muted)]">加载中...</div>
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-6 py-12 text-[var(--text-primary)]">
        <div className="mx-auto max-w-2xl text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <h1 className="text-2xl font-semibold">找不到这位运动员</h1>
          <p className="mt-2 text-[var(--text-muted)]">这条档案可能已经被删除，或者当前设备上还没有同步到对应数据。</p>
          <Link
            href="/athletes"
            className="mt-6 inline-flex items-center gap-2 bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--bg-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回运动员列表
          </Link>
        </div>
      </div>
    )
  }

  const stats = getAthleteStats(athlete.id)
  const createdDate = new Date(athlete.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--line-default)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/athletes"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>

          <Link
            href="/analysis/new"
            className="text-sm font-medium text-[var(--accent)] transition-sharp hover:opacity-80"
          >
            为 TA 新建分析
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="border-b border-[var(--line-default)] pb-8">
          <div className="editorial-title mb-4 text-[var(--accent)]">ATHLETE PROFILE</div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center border border-[var(--line-strong)]">
                  <User className="h-6 w-6 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">{athlete.name}</h1>
                  <p className="text-[var(--text-secondary)]">
                    {athlete.position}
                    {athlete.team ? ` // ${athlete.team}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-muted)]">档案创建于 {createdDate}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="报告数" value={stats.totalReports} />
              <StatCard label="平均分" value={stats.averageScore} accent={stats.averageScore >= 70} />
              <StatCard label="最佳分" value={stats.bestScore} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-10 lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">历史报告</h2>
              <span className="text-sm text-[var(--text-muted)]">{reports.length} 份</span>
            </div>

            {reports.length === 0 ? (
              <div className="border border-dashed border-[var(--line-strong)] p-8 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-[var(--text-muted)]">这位运动员还没有分析报告。</p>
                <Link href="/analysis/new" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
                  立即创建第一份报告 →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/analysis/${report.id}`}
                    className="group flex items-center justify-between border border-[var(--line-default)] p-4 transition-sharp hover:border-[var(--accent)]"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center border text-lg font-bold",
                          report.overallScore >= 70
                            ? "border-[var(--accent)] text-[var(--accent)]"
                            : "border-[var(--line-strong)] text-[var(--text-secondary)]"
                        )}
                      >
                        {report.overallScore}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
                          {report.verdict}
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                          {new Date(report.createdAt).toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:text-[var(--accent)]" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="border border-[var(--line-default)] p-5">
              <div className="mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                <Trophy className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-lg font-semibold">表现概览</h2>
              </div>
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <p>最佳分数：{stats.bestScore}</p>
                <p>最低分数：{stats.worstScore}</p>
                <p>平均分数：{stats.averageScore}</p>
              </div>
            </div>

            <div className="border border-[var(--line-default)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">下一步建议</h2>
              <div className="mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
                {reports.length === 0 ? (
                  <p>先录入一场比赛或一次训练，系统就能开始沉淀这位运动员的基线。</p>
                ) : stats.averageScore >= 75 ? (
                  <p>当前整体表现稳定，可以继续累积样本，重点观察高分表现是否可持续复现。</p>
                ) : (
                  <p>建议继续补充近期训练和比赛数据，用更连续的样本判断问题是偶发波动还是稳定短板。</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border border-[var(--line-default)] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</div>
      <div className={cn("mt-2 text-2xl font-bold text-[var(--text-primary)]", accent ? "text-[var(--accent)]" : "")}>
        {value}
      </div>
    </div>
  )
}
