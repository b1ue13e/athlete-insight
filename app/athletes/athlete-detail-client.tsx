"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, ChevronRight, FileText, Trophy, User, type LucideIcon } from "lucide-react"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { useAuth } from "@/contexts/auth-context"
import { AthleteProfile, fetchAthleteById } from "@/lib/athletes"
import {
  getDiagnosisRecordsForAthlete,
  getDiagnosisStatsForAthlete,
  syncDiagnosisRecordsFromSupabase,
  type DiagnosisRecordSummary,
} from "@/lib/analysis/store"
import { getAnalysisDetailHref } from "@/lib/analysis/routes"
import { cn } from "@/lib/utils"

export function AthleteDetailPageClient({ id }: { id: string }) {
  const { isAuthenticated, user } = useAuth()
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null)
  const [reports, setReports] = useState<DiagnosisRecordSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void fetchAthleteById(id, user?.id).then((nextAthlete) => {
      if (!cancelled) {
        setAthlete(nextAthlete)
        setReports(getDiagnosisRecordsForAthlete(id, nextAthlete?.name))
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [id, user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    void Promise.all([fetchAthleteById(id, user.id), syncDiagnosisRecordsFromSupabase(user.id)]).then(([nextAthlete]) => {
      setAthlete(nextAthlete)
      setReports(getDiagnosisRecordsForAthlete(id, nextAthlete?.name))
      setLoading(false)
    })
  }, [id, isAuthenticated, user])

  const stats = useMemo(() => {
    if (!athlete) {
      return {
        totalReports: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        helpfulCount: 0,
        missedCount: 0,
      }
    }
    return getDiagnosisStatsForAthlete(athlete.id, athlete.name)
  }, [athlete])

  if (loading) {
    return (
      <WorkspaceShell title="运动员详情" subtitle="正在整理档案..." eyebrow="Athlete profile">
        <div className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] px-5 py-8 text-sm text-[var(--text-secondary)]">
          正在整理这位运动员的档案与历史诊断...
        </div>
      </WorkspaceShell>
    )
  }

  if (!athlete) {
    return (
      <WorkspaceShell title="运动员详情" subtitle="未找到该档案" eyebrow="Athlete profile" actions={<Link href="/athletes" className="action-secondary text-sm">返回列表</Link>}>
        <div className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] px-6 py-10 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">找不到这位运动员</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            这条档案可能已经被删除，或者当前设备上还没有同步到对应的本地记录。
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/athletes" className="action-primary text-sm">
              返回运动员列表
            </Link>
          </div>
        </div>
      </WorkspaceShell>
    )
  }

  const createdDate = new Date(athlete.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <WorkspaceShell
      title={athlete.name}
      subtitle={[athlete.position, athlete.team].filter(Boolean).join(" · ") || "运动员档案"}
      eyebrow="Athlete profile"
      actions={
        <>
          <Link href="/athletes" className="action-secondary text-sm">返回列表</Link>
          <Link href="/analysis/new" className="action-primary text-sm">为 TA 新建诊断</Link>
        </>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="panel-elevated relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
            <div className="hero-orbit left-[-8%] top-[-16%] h-48 w-48 opacity-20" />
            <div className="hero-orbit bottom-[-18%] right-[-10%] h-52 w-52 opacity-20" />

            <div className="relative z-10 space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line-accent)] bg-[var(--accent-dim)]">
                <User className="h-7 w-7 text-[var(--accent)]" />
              </div>

              <div className="space-y-2">
                <div className="eyebrow text-[var(--accent)]">Observation file</div>
                <h1 className="font-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.96] tracking-[-0.04em] text-[var(--text-primary)]">
                  {athlete.name}
                </h1>
                <p className="text-sm text-[var(--text-secondary)] sm:text-base">
                  {athlete.position}
                  {athlete.team ? ` · ${athlete.team}` : ""}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">档案建立于 {createdDate}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <MetricCard label="诊断数" value={String(stats.totalReports)} icon={FileText} />
                <MetricCard label="平均分" value={stats.totalReports ? String(stats.averageScore) : "--"} icon={Trophy} accent={stats.averageScore >= 70} />
                <MetricCard label="最佳表现" value={stats.totalReports ? String(stats.bestScore) : "--"} icon={Trophy} />
                <MetricCard label="靠谱反馈" value={String(stats.helpfulCount)} icon={User} />
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <SurfaceCard title="当前摘要" description="先把最值得持续跟进的观察点收拢到一起。">
              <SummaryCard title="最佳样本" description={stats.totalReports === 0 ? "还没有诊断样本，先补第一份记录建立基线。" : `当前最佳单次得分为 ${stats.bestScore}，可以把它当作高质量发挥的参考样本。`} />
              <SummaryCard title="稳定程度" description={reports.length === 0 ? "当前没有连续样本，暂时还不适合看趋势。" : `目前累计 ${reports.length} 份样本，平均分为 ${stats.averageScore}。后续更值得看的是高分表现能否持续复现。`} />
              <SummaryCard title="反馈闭环" description={`判断靠谱 ${stats.helpfulCount} 次，待修正 ${stats.missedCount} 次。持续反馈会让结论越来越稳。`} />
            </SurfaceCard>

            <SurfaceCard title="下一步建议" description="根据当前样本量，决定接下来最该做的动作。">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                {reports.length === 0
                  ? "先补一到两份诊断样本，再开始看趋势。"
                  : stats.averageScore >= 75
                    ? "当前表现相对稳定，建议继续积累不同场景下的样本，重点看高分表现是否可复现。"
                    : "建议连续记录最近几次训练或比赛，让系统判断问题是偶发波动还是稳定短板。"}
              </p>
            </SurfaceCard>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="eyebrow">Recent diagnosis</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">最近的诊断记录</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  这里会按照时间保留最近诊断。你可以沿着时间回看趋势，也可以直接进入单份报告查看证据链、风险和下次动作。
                </p>
              </div>
              <div className="data-pill text-xs uppercase tracking-[0.18em]">共 {reports.length} 份诊断</div>
            </div>

            <div className="mt-5 space-y-3">
              {reports.length === 0 ? (
                <div className="rounded-[1.1rem] border border-dashed border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-5">
                  <div className="text-lg font-semibold text-[var(--text-primary)]">这位运动员还没有诊断记录</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    先完成一次训练或比赛分析，这里就会开始沉淀统一诊断记录。
                  </p>
                  <Link href="/analysis/new" className="action-primary mt-4 text-sm">立即创建第一份诊断</Link>
                </div>
              ) : (
                reports.map((report) => (
                  <Link
                    key={report.id}
                    href={getAnalysisDetailHref(report.id)}
                    className="group flex flex-col gap-4 rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 transition-sharp hover:border-[var(--line-strong)] hover:bg-[var(--bg-tertiary)] sm:flex-row sm:items-center sm:justify-between"
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
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
                            {report.title}
                          </div>
                          <div className="data-pill text-[10px] uppercase tracking-[0.18em]">{report.rangeLabel}</div>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">{report.verdict}</div>
                        <div className="text-sm text-[var(--text-tertiary)]">
                          {new Date(report.createdAt).toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="data-pill text-xs uppercase tracking-[0.18em]">
                        {report.feedback === "helpful" ? "判断靠谱" : report.feedback === "missed" ? "待修正" : `可信度 ${report.confidenceLabel}`}
                      </div>
                      <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <SurfaceCard title="表现概览" description="用一组紧凑指标快速扫一眼当前档案。">
              <CompactMetric label="最佳分数" value={stats.totalReports ? String(stats.bestScore) : "--"} />
              <CompactMetric label="最低分数" value={stats.totalReports ? String(stats.worstScore) : "--"} />
              <CompactMetric label="平均分数" value={stats.totalReports ? String(stats.averageScore) : "--"} />
            </SurfaceCard>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  )
}

function SurfaceCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
      <div className="eyebrow">Summary</div>
      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={cn("mt-4 text-4xl font-semibold tracking-[-0.05em]", accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{value}</div>
    </div>
  )
}

function SummaryCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-primary)_88%,transparent)] p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-list-row">
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
      <div className="text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}
