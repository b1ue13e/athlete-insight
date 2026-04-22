"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Search,
  ShieldCheck,
  Dumbbell,
  Trophy,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { getDiagnosisSummaries, syncDiagnosisRecordsFromSupabase, type DiagnosisRecordSummary } from "@/lib/analysis/store"
import { getAnalysisDetailHref } from "@/lib/analysis/routes"
import { cn } from "@/lib/utils"

const SPORT_FILTERS = [
  { key: "all", label: "全部", icon: History, color: "#d6ff72" },
  { key: "running", label: "跑步", icon: Activity, color: "#d6ff72" },
  { key: "gym", label: "健身", icon: Dumbbell, color: "#ffc941" },
  { key: "volleyball", label: "排球", icon: Trophy, color: "#6fb1ff" },
] as const

const FEEDBACK_FILTERS = [
  { key: "all", label: "全部反馈" },
  { key: "helpful", label: "靠谱" },
  { key: "missed", label: "待修正" },
  { key: "pending", label: "未标记" },
] as const

const sportMeta: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  running: { label: "跑步", icon: Activity, color: "#d6ff72" },
  gym: { label: "健身", icon: Dumbbell, color: "#ffc941" },
  volleyball: { label: "排球", icon: Trophy, color: "#6fb1ff" },
}

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth()
  const [records, setRecords] = useState<DiagnosisRecordSummary[]>([])
  const [query, setQuery] = useState("")
  const [sportFilter, setSportFilter] = useState<(typeof SPORT_FILTERS)[number]["key"]>("all")
  const [feedbackFilter, setFeedbackFilter] = useState<(typeof FEEDBACK_FILTERS)[number]["key"]>("all")

  useEffect(() => {
    setRecords(getDiagnosisSummaries())
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user) return

    void syncDiagnosisRecordsFromSupabase(user.id).then(() => {
      setRecords(getDiagnosisSummaries())
    })
  }, [isAuthenticated, user])

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return records.filter((record) => {
      const sportMatched = sportFilter === "all" ? true : record.sport === sportFilter
      const feedbackMatched =
        feedbackFilter === "all"
          ? true
          : feedbackFilter === "pending"
            ? !record.feedback
            : record.feedback === feedbackFilter
      const textMatched =
        !normalizedQuery ||
        [record.title, record.verdict, record.athleteName, record.rangeLabel, record.confidenceLabel]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)

      return sportMatched && feedbackMatched && textMatched
    })
  }, [feedbackFilter, query, records, sportFilter])

  const metrics = useMemo(() => {
    const averageScore = filteredRecords.length
      ? Math.round(filteredRecords.reduce((sum, item) => sum + item.overallScore, 0) / filteredRecords.length)
      : null

    return {
      total: records.length,
      visible: filteredRecords.length,
      averageScore,
      helpful: filteredRecords.filter((item) => item.feedback === "helpful").length,
      pending: filteredRecords.filter((item) => !item.feedback).length,
    }
  }, [filteredRecords, records.length])

  const bySport = useMemo(() => {
    return Object.entries(sportMeta).map(([key, meta]) => ({
      key,
      ...meta,
      count: filteredRecords.filter((item) => item.sport === key).length,
    }))
  }, [filteredRecords])

  return (
    <WorkspaceShell
      title="历史诊断"
      subtitle={`${records.length} 份报告 · ${metrics.pending} 份待反馈`}
      eyebrow="Diagnosis archive"
      actions={
        <Link href="/analysis/new" className="action-primary text-sm">
          <FileText className="h-4 w-4" />
          新建诊断
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="全部诊断" value={String(metrics.total)} note="当前设备可见记录" icon={History} accent={metrics.total > 0} />
          <MetricCard label="筛选结果" value={String(metrics.visible)} note="符合当前筛选条件" icon={Search} />
          <MetricCard label="平均分" value={metrics.averageScore === null ? "--" : String(metrics.averageScore)} note="基于当前筛选结果" icon={Activity} />
          <MetricCard label="待反馈" value={String(metrics.pending)} note="还没标记是否靠谱" icon={ShieldCheck} />
        </section>

        <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Filters</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">筛选与检索</h2>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex items-center gap-3 rounded-[1.05rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索运动员、结论、可信度..."
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {SPORT_FILTERS.map((option) => {
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

          <div className="mt-4 flex flex-wrap gap-2">
            {FEEDBACK_FILTERS.map((option) => {
              const active = feedbackFilter === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFeedbackFilter(option.key)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm font-medium transition-sharp",
                    active
                      ? "border-[var(--line-strong)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                      : "border-[var(--line-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Archive</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">诊断记录</h2>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{filteredRecords.length} 条</div>
            </div>

            <div className="mt-5 space-y-3">
              {filteredRecords.length === 0 ? (
                <EmptyPanel title="没有匹配的诊断记录" description="可以放宽筛选条件，或者直接创建一份新诊断。" href="/analysis/new" cta="去新建诊断" />
              ) : (
                filteredRecords.map((record) => {
                  const meta = sportMeta[record.sport] ?? sportMeta.running
                  const SportIcon = meta.icon
                  return (
                    <Link
                      key={record.id}
                      href={getAnalysisDetailHref(record.id)}
                      className="group flex items-center gap-4 rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 transition-sharp hover:border-[var(--line-strong)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
                        {record.overallScore}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line-default)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                            <SportIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{record.athleteName}</span>
                          <span className="text-xs text-[var(--text-muted)]">{new Date(record.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="mt-2 text-base font-semibold text-[var(--text-primary)]">{record.title}</div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">{record.verdict}</div>
                      </div>
                      <div className="hidden text-right lg:block">
                        <FeedbackTag feedback={record.feedback} />
                        <div className="mt-2 text-xs text-[var(--text-muted)]">{record.confidenceLabel}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-sharp group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Feedback</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">反馈状态</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <MiniMetric label="靠谱" value={String(metrics.helpful)} icon={CheckCircle2} />
                <MiniMetric label="待反馈" value={String(metrics.pending)} icon={Clock3} />
                <MiniMetric label="总可见" value={String(metrics.visible)} icon={FileText} />
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">Distribution</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">专项分布</h2>
              <div className="mt-5 space-y-4">
                {bySport.map((item) => {
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
                        <div className="h-full rounded-full" style={{ width: `${filteredRecords.length ? (item.count / filteredRecords.length) * 100 : 0}%`, backgroundColor: item.color }} />
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

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function FeedbackTag({ feedback }: { feedback?: DiagnosisRecordSummary["feedback"] }) {
  if (feedback === "helpful") {
    return <span className="rounded-full bg-[rgba(214,255,114,0.16)] px-3 py-1 text-xs font-semibold text-[#d6ff72]">靠谱</span>
  }

  if (feedback === "missed") {
    return <span className="rounded-full bg-[rgba(255,201,65,0.16)] px-3 py-1 text-xs font-semibold text-[#ffc941]">待修正</span>
  }

  return <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">未标记</span>
}

function EmptyPanel({
  title,
  description,
  href,
  cta,
}: {
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-5">
      <div className="text-lg font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      <Link href={href} className="action-primary mt-4 text-sm">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

