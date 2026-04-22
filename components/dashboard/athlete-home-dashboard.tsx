"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  CalendarRange,
  Dumbbell,
  FileText,
  Plus,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { AthleteProfile, listAthletes } from "@/lib/athletes"
import {
  getDiagnosisStatsForAthlete,
  getDiagnosisSummaries,
  syncDiagnosisRecordsFromSupabase,
  type DiagnosisRecordSummary,
} from "@/lib/analysis/store"
import { getAnalysisDetailHref } from "@/lib/analysis/routes"
import { cn } from "@/lib/utils"
import { getAthleteDetailHref } from "@/lib/athlete-routes"

const launchActions: Array<{
  href: string
  title: string
  description: string
  icon: LucideIcon
  color: string
}> = [
  {
    href: "/analysis/new/running",
    title: "跑步诊断",
    description: "单次训练 / 周复盘",
    icon: Activity,
    color: "#d6ff72",
  },
  {
    href: "/analysis/new/gym",
    title: "健身诊断",
    description: "训练质量 / 目标匹配",
    icon: Dumbbell,
    color: "#ffc941",
  },
  {
    href: "/analysis/new",
    title: "排球诊断",
    description: "比赛表现 / 位置分析",
    icon: Trophy,
    color: "#6fb1ff",
  },
]

const sportPalette: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  running: { label: "跑步", color: "#d6ff72", icon: Activity },
  gym: { label: "健身", color: "#ffc941", icon: Dumbbell },
  volleyball: { label: "排球", color: "#6fb1ff", icon: Trophy },
}

export function AthleteHomeDashboard() {
  const { user, isAuthenticated } = useAuth()
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecordSummary[]>([])

  useEffect(() => {
    let cancelled = false

    void listAthletes(user?.id).then((nextAthletes) => {
      if (!cancelled) {
        setAthletes(nextAthletes)
      }
    })

    if (!cancelled) {
      setDiagnoses(getDiagnosisSummaries())
    }

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    void Promise.all([listAthletes(user.id), syncDiagnosisRecordsFromSupabase(user.id)]).then(([nextAthletes]) => {
      setAthletes(nextAthletes)
      setDiagnoses(getDiagnosisSummaries())
    })
  }, [isAuthenticated, user])

  const averageScore = useMemo(() => {
    if (diagnoses.length === 0) return null
    return Math.round(diagnoses.reduce((sum, item) => sum + item.overallScore, 0) / diagnoses.length)
  }, [diagnoses])

  const weeklyDiagnoses = useMemo(() => {
    const now = Date.now()
    const week = 1000 * 60 * 60 * 24 * 7
    return diagnoses.filter((item) => now - new Date(item.createdAt).getTime() <= week)
  }, [diagnoses])

  const featuredAthletes = useMemo(() => {
    void diagnoses.length
    return athletes
      .map((athlete) => ({
        athlete,
        stats: getDiagnosisStatsForAthlete(athlete.id, athlete.name),
      }))
      .sort((left, right) => {
        if (right.stats.totalReports !== left.stats.totalReports) {
          return right.stats.totalReports - left.stats.totalReports
        }

        return new Date(right.athlete.updatedAt).getTime() - new Date(left.athlete.updatedAt).getTime()
      })
      .slice(0, 5)
  }, [athletes, diagnoses.length])

  const activeAthleteCount = featuredAthletes.filter((item) => item.stats.totalReports > 0).length

  const breakdown = useMemo(() => {
    return Object.entries(sportPalette).map(([key, config]) => ({
      key,
      ...config,
      count: diagnoses.filter((item) => item.sport === key).length,
    }))
  }, [diagnoses])

  const maxBreakdown = Math.max(1, ...breakdown.map((item) => item.count))

  const sevenDayGrid = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date()
      day.setDate(day.getDate() - (6 - index))

      const entries = diagnoses.filter((item) => {
        const created = new Date(item.createdAt)
        return created.toDateString() === day.toDateString()
      })

      return {
        key: day.toISOString(),
        label: day.toLocaleDateString("zh-CN", { weekday: "narrow" }),
        score: entries.length
          ? Math.round(entries.reduce((sum, item) => sum + item.overallScore, 0) / entries.length)
          : null,
      }
    })
  }, [diagnoses])

  const latestRecord = diagnoses[0] ?? null
  const subtitle = `${diagnoses.length} 份诊断 · ${athletes.length} 位运动员`

  return (
    <WorkspaceShell
      title="训练诊断工作台"
      subtitle={subtitle}
      eyebrow="Training diagnosis workspace"
      actions={
        <>
          <Link href="/analysis/new" className="action-secondary text-sm">
            <Zap className="h-4 w-4" />
            快速诊断
          </Link>
          <Link href="/analysis/new" className="action-primary text-sm">
            <Plus className="h-4 w-4" />
            新建诊断
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="平均评分" value={averageScore === null ? "--" : String(averageScore)} note={averageScore === null ? "暂无诊断样本" : "所有诊断平均值"} icon={Activity} accent={averageScore !== null} />
          <MetricCard label="总诊断数" value={String(diagnoses.length)} note={`最近 7 天新增 ${weeklyDiagnoses.length} 次`} icon={FileText} />
          <MetricCard label="运动员" value={String(athletes.length)} note={`其中 ${activeAthleteCount} 位已有样本`} icon={Users} />
          <MetricCard label="本周训练量" value={String(weeklyDiagnoses.length)} note={latestRecord ? `最新结论：${latestRecord.rangeLabel}` : "等待第一份诊断"} icon={CalendarRange} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <SurfaceCard>
              <SectionHeader title="快速开始" description="从一个训练入口直接开始，先拿到可执行结论。" />
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {launchActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 transition-sharp hover:border-[var(--line-strong)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${action.color}18`, color: action.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-[var(--text-primary)]">{action.title}</div>
                          <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{action.description}</div>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 text-[var(--text-muted)] transition-sharp group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeader
                title="最近诊断"
                description="把最近几次判断放在一起，方便回看节奏是否稳定。"
                action={
                  <Link href="/history" className="text-sm font-medium text-[var(--accent)] transition-sharp hover:text-[var(--text-primary)]">
                    查看全部
                  </Link>
                }
              />

              <div className="mt-5 space-y-3">
                {diagnoses.length === 0 ? (
                  <EmptyPanel
                    title="还没有保存的诊断"
                    description="先完成第一份训练或比赛分析，这里会自动长出最近诊断列表。"
                    href="/analysis/new"
                    cta="开始第一份诊断"
                  />
                ) : (
                  diagnoses.slice(0, 5).map((diagnosis) => {
                    const sport = sportPalette[diagnosis.sport] ?? sportPalette.running
                    const SportIcon = sport.icon

                    return (
                      <Link
                        key={diagnosis.id}
                        href={getAnalysisDetailHref(diagnosis.id)}
                        className="group flex items-center gap-4 rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 transition-sharp hover:border-[var(--line-strong)] hover:bg-[var(--bg-tertiary)]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold" style={{ backgroundColor: `${sport.color}18`, color: sport.color }}>
                          {diagnosis.overallScore}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                              <SportIcon className="h-3 w-3" />
                              {sport.label}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(diagnosis.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="mt-2 truncate text-base font-semibold text-[var(--text-primary)]">{diagnosis.athleteName}</div>
                          <div className="mt-1 truncate text-sm text-[var(--text-secondary)]">{diagnosis.verdict}</div>
                        </div>
                        <div className="hidden text-sm text-[var(--text-secondary)] lg:block">{diagnosis.rangeLabel}</div>
                        <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-sharp group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
                      </Link>
                    )
                  })
                )}
              </div>
            </SurfaceCard>
          </div>

          <div className="space-y-4">
            <SurfaceCard>
              <SectionHeader title="常用运动员" description="优先显示已有样本、值得继续跟进的对象。" />
              <div className="mt-5 space-y-3">
                {featuredAthletes.length === 0 ? (
                  <EmptyPanel title="还没有运动员档案" description="从一次新分析开始，系统会自动沉淀运动员档案。" href="/analysis/new" cta="去创建诊断" compact />
                ) : (
                  featuredAthletes.map(({ athlete, stats }) => (
                    <Link
                      key={athlete.id}
                      href={getAthleteDetailHref(athlete.id)}
                      className="group flex items-center gap-3 rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 transition-sharp hover:border-[var(--line-strong)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)]">
                        {athlete.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{athlete.name}</div>
                        <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          {[athlete.position, athlete.team].filter(Boolean).join(" · ") || "等待第一份样本"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{stats.totalReports}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">次诊断</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeader title="诊断分布" description="当前数据主要集中在哪些专项。" />
              <div className="mt-5 space-y-4">
                {breakdown.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 text-[var(--text-primary)]">
                          <Icon className="h-4 w-4" style={{ color: item.color }} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-semibold text-[var(--text-secondary)]">{item.count}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(item.count / maxBreakdown) * 100}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeader title="本周概览" description="最近 7 天的平均分布，方便快速扫一眼。" />
              <div className="mt-5 grid grid-cols-7 gap-2">
                {sevenDayGrid.map((item) => (
                  <div key={item.key} className="text-center">
                    <div className="mb-2 text-[11px] text-[var(--text-muted)]">{item.label}</div>
                    <div
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-xl border text-xs font-semibold",
                        item.score === null
                          ? "border-[var(--line-default)] bg-[var(--bg-primary)] text-[var(--text-muted)]"
                          : item.score >= 75
                            ? "border-transparent bg-[color-mix(in_oklch,var(--accent)_22%,var(--bg-primary))] text-[var(--accent)]"
                            : item.score >= 60
                              ? "border-transparent bg-[rgba(255,201,65,0.16)] text-[#ffc941]"
                              : "border-transparent bg-[rgba(111,177,255,0.16)] text-[#6fb1ff]"
                      )}
                    >
                      {item.score ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  )
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">{children}</section>
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Workspace</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={cn("mt-5 text-5xl font-semibold tracking-[-0.06em]", accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{value}</div>
      <div className="mt-2 text-sm text-[var(--text-secondary)]">{note}</div>
    </div>
  )
}

function EmptyPanel({
  title,
  description,
  href,
  cta,
  compact = false,
}: {
  title: string
  description: string
  href: string
  cta: string
  compact?: boolean
}) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-5">
      <div className={cn("font-semibold text-[var(--text-primary)]", compact ? "text-base" : "text-lg")}>{title}</div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      <Link href={href} className="action-primary mt-4 text-sm">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
