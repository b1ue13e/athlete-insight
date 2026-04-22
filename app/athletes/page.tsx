"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  Dumbbell,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  type AthletePrimarySport,
  type AthleteProfile,
  createAthlete,
  deleteAthlete,
  deleteAthleteReports,
  listAthletes,
} from "@/lib/athletes"
import {
  deleteDiagnosisRecordsForAthlete,
  getDiagnosisStatsForAthlete,
  syncDiagnosisRecordsFromSupabase,
} from "@/lib/analysis/store"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { cn } from "@/lib/utils"
import { getAthleteDetailHref } from "@/lib/athlete-routes"

const sportOptions = [
  { key: "all", label: "全部", icon: Users, color: "#d6ff72" },
  { key: "running", label: "跑步", icon: Activity, color: "#d6ff72" },
  { key: "gym", label: "健身", icon: Dumbbell, color: "#ffc941" },
  { key: "volleyball", label: "排球", icon: Trophy, color: "#6fb1ff" },
] as const

type SportFilter = (typeof sportOptions)[number]["key"]

function normalizeSport(sport?: AthletePrimarySport) {
  if (sport === "fitness") return "gym"
  return sport ?? "running"
}

export default function AthletesPage() {
  const { isAuthenticated, user } = useAuth()
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [sportFilter, setSportFilter] = useState<SportFilter>("all")
  const [draft, setDraft] = useState({
    name: "",
    position: "",
    team: "",
    sport: "running" as Exclude<SportFilter, "all">,
  })

  useEffect(() => {
    let cancelled = false

    void listAthletes(user?.id).then((nextAthletes) => {
      if (!cancelled) {
        setAthletes(nextAthletes)
        setIsLoading(false)
      }
    })

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
      setIsLoading(false)
    })
  }, [isAuthenticated, user])

  const athleteCards = useMemo(() => {
    return athletes.map((athlete) => ({
      athlete,
      sport: normalizeSport(athlete.primarySport),
      stats: getDiagnosisStatsForAthlete(athlete.id, athlete.name),
    }))
  }, [athletes])

  const filteredAthletes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return athleteCards
      .filter((item) => {
        const sportMatched = sportFilter === "all" ? true : item.sport === sportFilter
        const textMatched =
          !normalizedQuery ||
          [item.athlete.name, item.athlete.position, item.athlete.team, item.sport]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)

        return sportMatched && textMatched
      })
      .sort((left, right) => {
        if (right.stats.totalReports !== left.stats.totalReports) {
          return right.stats.totalReports - left.stats.totalReports
        }
        return new Date(right.athlete.updatedAt).getTime() - new Date(left.athlete.updatedAt).getTime()
      })
  }, [athleteCards, query, sportFilter])

  const totals = useMemo(() => {
    const totalReports = athleteCards.reduce((sum, item) => sum + item.stats.totalReports, 0)
    const activeAthletes = athleteCards.filter((item) => item.stats.totalReports > 0).length
    const averageScore = athleteCards.length
      ? Math.round(
          athleteCards.reduce((sum, item) => sum + (item.stats.averageScore || 0), 0) /
            Math.max(1, athleteCards.filter((item) => item.stats.totalReports > 0).length)
        )
      : 0

    return { totalReports, activeAthletes, averageScore }
  }, [athleteCards])

  const sportCounts = useMemo(() => {
    return sportOptions
      .filter((option) => option.key !== "all")
      .map((option) => ({
        ...option,
        count: athleteCards.filter((item) => item.sport === option.key).length,
      }))
  }, [athleteCards])

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("确定要删除这位运动员吗？相关分析报告也会一起删除。")
    if (!confirmed) return

    await deleteAthlete(id, user?.id)
    deleteAthleteReports(id)
    const athlete = athletes.find((item) => item.id === id)
    await deleteDiagnosisRecordsForAthlete(id, athlete?.name, user?.id)
    setAthletes((current) => current.filter((item) => item.id !== id))
  }

  const handleCreate = async () => {
    if (!draft.name.trim()) return

    const nextAthlete = await createAthlete(
      {
        name: draft.name.trim(),
        position: draft.position.trim() || "未设置",
        team: draft.team.trim() || undefined,
        primarySport: draft.sport,
      },
      user?.id
    )

    setAthletes((current) => [nextAthlete, ...current.filter((item) => item.id !== nextAthlete.id)])
    setDraft({ name: "", position: "", team: "", sport: "running" })
  }

  return (
    <WorkspaceShell
      title="运动员管理"
      subtitle={`${athletes.length} 位运动员 · ${totals.totalReports} 份诊断样本`}
      eyebrow="Athlete library"
      actions={
        <Link href="/analysis/new" className="action-primary text-sm">
          <Plus className="h-4 w-4" />
          新建诊断
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="运动员" value={String(athletes.length)} note="当前档案总数" icon={Users} accent={athletes.length > 0} />
          <MetricCard label="活跃档案" value={String(totals.activeAthletes)} note="已有诊断样本" icon={Activity} />
          <MetricCard label="累计报告" value={String(totals.totalReports)} note="所有运动员合计" icon={Plus} />
          <MetricCard label="样本均分" value={totals.activeAthletes === 0 ? "--" : String(totals.averageScore)} note="只统计已有样本档案" icon={ArrowRight} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Filter</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">运动员列表</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">按专项和关键词筛选，快速找到需要继续观察的对象。</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="flex items-center gap-3 rounded-[1.05rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-3">
                  <Search className="h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索运动员、位置或队伍..."
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {sportOptions.map((option) => {
                    const Icon = option.icon
                    const active = sportFilter === option.key

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSportFilter(option.key)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-sharp",
                          active
                            ? "border-transparent text-[var(--bg-primary)]"
                            : "border-[var(--line-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                        style={active ? { backgroundColor: option.color } : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Roster</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">最近的运动员档案</h2>
                </div>
                <div className="text-sm text-[var(--text-secondary)]">{filteredAthletes.length} 条结果</div>
              </div>

              <div className="mt-5 space-y-3">
                {isLoading ? (
                  <div className="rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-5 text-sm text-[var(--text-secondary)]">
                    正在整理运动员档案...
                  </div>
                ) : filteredAthletes.length === 0 ? (
                  <EmptyPanel title="没有匹配结果" description="可以先创建一个新档案，或者从一次新诊断开始自动沉淀。" />
                ) : (
                  filteredAthletes.map(({ athlete, stats, sport }) => {
                    const sportMeta = sportOptions.find((item) => item.key === sport) ?? sportOptions[1]
                    const SportIcon = sportMeta.icon

                    return (
                      <div key={athlete.id} className="rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 transition-sharp hover:border-[var(--line-strong)] hover:bg-[var(--bg-tertiary)]">
                        <div className="flex gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--line-default)] bg-[var(--bg-secondary)] text-base font-semibold text-[var(--text-primary)]">
                            {athlete.name.slice(0, 1)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={getAthleteDetailHref(athlete.id)} className="text-base font-semibold text-[var(--text-primary)] transition-sharp hover:text-[var(--accent)]">
                                {athlete.name}
                              </Link>
                              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line-default)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                                <SportIcon className="h-3 w-3" style={{ color: sportMeta.color }} />
                                {sportMeta.label}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-[var(--text-secondary)]">
                              {[athlete.position, athlete.team].filter(Boolean).join(" · ") || "还没有补充位置与队伍信息"}
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <MiniStat label="诊断" value={String(stats.totalReports)} />
                              <MiniStat label="均分" value={stats.totalReports ? String(stats.averageScore) : "--"} />
                              <MiniStat label="最佳" value={stats.totalReports ? String(stats.bestScore) : "--"} />
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Link href={getAthleteDetailHref(athlete.id)} className="action-secondary text-sm">
                              查看
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDelete(athlete.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-sharp hover:text-[#ff8b78]"
                              aria-label={`删除 ${athlete.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Create athlete</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">新增档案</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">这里先建立一个基础对象，后续所有诊断都会沉淀到这位运动员名下。</p>

              <div className="mt-5 space-y-3">
                <Field label="姓名 *">
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="例如：林浩然"
                    className="w-full rounded-[1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--line-strong)]"
                  />
                </Field>

                <Field label="专项">
                  <div className="grid grid-cols-3 gap-2">
                    {sportOptions
                      .filter((option) => option.key !== "all")
                      .map((option) => {
                        const active = draft.sport === option.key
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setDraft((current) => ({ ...current, sport: option.key }))}
                            className={cn(
                              "rounded-[1rem] border px-3 py-3 text-sm font-medium transition-sharp",
                              active
                                ? "border-transparent text-[var(--bg-primary)]"
                                : "border-[var(--line-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                            )}
                            style={active ? { backgroundColor: option.color } : undefined}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                  </div>
                </Field>

                <Field label="位置 / 方向">
                  <input
                    value={draft.position}
                    onChange={(event) => setDraft((current) => ({ ...current, position: event.target.value }))}
                    placeholder="例如：主攻、增肌、半马"
                    className="w-full rounded-[1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--line-strong)]"
                  />
                </Field>

                <Field label="队伍 / 备注">
                  <input
                    value={draft.team}
                    onChange={(event) => setDraft((current) => ({ ...current, team: event.target.value }))}
                    placeholder="例如：校田径队"
                    className="w-full rounded-[1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--line-strong)]"
                  />
                </Field>
              </div>

              <button type="button" onClick={() => void handleCreate()} className="action-primary mt-5 w-full text-sm">
                <Plus className="h-4 w-4" />
                创建运动员档案
              </button>
            </section>

            <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Distribution</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">专项分布</h2>
              <div className="mt-5 space-y-4">
                {sportCounts.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[var(--text-primary)]">
                          <Icon className="h-4 w-4" style={{ color: item.color }} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-semibold text-[var(--text-secondary)]">{item.count}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[var(--bg-primary)]">
                        <div className="h-full rounded-full" style={{ width: `${athletes.length ? (item.count / athletes.length) * 100 : 0}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </section>
      </div>
    </WorkspaceShell>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.95rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">{label}</div>
      {children}
    </label>
  )
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-5">
      <div className="text-lg font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}
