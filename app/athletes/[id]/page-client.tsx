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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6 text-sm text-[var(--text-secondary)]">
        正在整理运动员档案...
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-16 text-[var(--text-primary)] sm:px-6 lg:px-8">
        <div className="panel mx-auto max-w-2xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
          <h1 className="font-display text-3xl tracking-[-0.03em] text-[var(--text-primary)]">找不到这位运动员</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            这条档案可能已经被删除，或者当前设备上还没有对应的数据记录。
          </p>
          <Link href="/athletes" className="action-primary mt-6 text-sm">
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-primary)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/athletes" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]">
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>

          <Link href="/analysis/new" className="action-primary text-sm">
            为 TA 新建分析
          </Link>
        </div>
      </header>

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.08fr)_340px] lg:items-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_88%,transparent)] px-6 py-8 sm:px-8 sm:py-10">
            <div className="hero-orbit left-[-8%] top-[-16%] h-48 w-48 opacity-20" />
            <div className="hero-orbit bottom-[-18%] right-[-10%] h-52 w-52 opacity-20" />

            <div className="relative z-10 space-y-6">
              <div className="eyebrow text-[var(--accent)]">Athlete profile</div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line-accent)] bg-[var(--accent-dim)]">
                    <User className="h-7 w-7 text-[var(--accent)]" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="font-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.96] tracking-[-0.04em] text-[var(--text-primary)]">
                      {athlete.name}
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] sm:text-base">
                      {athlete.position}
                      {athlete.team ? ` · ${athlete.team}` : ""}
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)]">档案创建于 {createdDate}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="报告数" value={stats.totalReports} />
                <StatCard label="平均分" value={stats.averageScore} accent={stats.averageScore >= 70} />
                <StatCard label="最佳表现" value={stats.bestScore} />
              </div>
            </div>
          </div>

          <aside className="panel-elevated space-y-5 p-6">
            <div className="eyebrow">档案摘要</div>
            <h2 className="font-display text-2xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
              这位运动员当前最值得继续看什么
            </h2>
            <div className="space-y-3">
              <SummaryCard title="最佳分数" description={`目前最佳单次得分为 ${stats.bestScore}，可以作为高质量表现的参考样本。`} />
              <SummaryCard title="稳定程度" description={reports.length === 0 ? "还没有样本，先补一到两份分析再开始看趋势。" : `当前共 ${reports.length} 份样本，平均分为 ${stats.averageScore}。`} />
              <SummaryCard
                title="建议动作"
                description={
                  reports.length === 0
                    ? "先录入一次比赛或训练数据，让系统建立第一条基线。"
                    : stats.averageScore >= 75
                      ? "继续补充样本，重点观察高分表现是否可重复。"
                      : "建议继续记录最近训练与比赛，判断波动是偶发还是稳定短板。"
                }
              />
            </div>
          </aside>
        </section>

        <section className="mx-auto mt-12 grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="eyebrow">历史报告</div>
                <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                  最近的分析记录
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  这里保留最近的判断结果。你可以沿着时间回看趋势，也可以直接进入单份报告查看细节。
                </p>
              </div>

              <div className="data-pill text-xs uppercase tracking-[0.18em]">
                <FileText className="h-3.5 w-3.5 text-[var(--accent)]" />
                共 {reports.length} 份报告
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="panel flex flex-col items-start gap-4 p-6 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line-accent)] bg-[var(--accent-dim)]">
                  <FileText className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)]">这位运动员还没有分析报告</h3>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                    先完成一次比赛或训练分析，这里就会开始沉淀长期记录。
                  </p>
                </div>
                <Link href="/analysis/new" className="action-primary text-sm">
                  立即创建第一份报告
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/analysis/${report.id}`}
                    className="panel group flex flex-col gap-4 p-4 transition-sharp hover:border-[var(--line-accent)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-lg font-bold",
                          report.overallScore >= 70
                            ? "border-[var(--line-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                            : "border-[var(--line-default)] bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                        )}
                      >
                        {report.overallScore}
                      </div>
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
                          {report.verdict}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {new Date(report.createdAt).toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="data-pill text-xs uppercase tracking-[0.18em]">查看详情</div>
                      <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="panel space-y-4 p-6">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Trophy className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-lg font-semibold">表现概览</h3>
              </div>
              <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <p>最佳分数：{stats.bestScore}</p>
                <p>最低分数：{stats.worstScore}</p>
                <p>平均分数：{stats.averageScore}</p>
              </div>
            </div>

            <div className="panel space-y-4 p-6">
              <div className="eyebrow">下一步建议</div>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                {reports.length === 0
                  ? "先补一份样本建立基线，后面再根据同一套结构做趋势判断。"
                  : stats.averageScore >= 75
                    ? "当前表现相对稳定，后续更值得关注的是高分表现能否在不同场景里复现。"
                    : "建议继续记录最近几次训练或比赛，让系统判断问题是偶发波动还是稳定短板。"}
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="metric-card">
      <div className="eyebrow">{label}</div>
      <div className={cn("mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]", accent ? "text-[var(--accent)]" : "")}>
        {value}
      </div>
    </div>
  )
}

function SummaryCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_84%,transparent)] p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}
