"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Plus, Trash2, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { AthleteProfile, deleteAthlete, deleteAthleteReports, listAthletes } from "@/lib/athletes"
import { deleteDiagnosisRecordsForAthlete, getDiagnosisStatsForAthlete, syncDiagnosisRecordsFromSupabase } from "@/lib/analysis/store"
import { cn } from "@/lib/utils"

export default function AthletesPage() {
  const { isAuthenticated, user } = useAuth()
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("确定要删除这位运动员吗？相关分析报告也会一起删除。")
    if (!confirmed) return

    await deleteAthlete(id, user?.id)
    deleteAthleteReports(id)
    const athlete = athletes.find((item) => item.id === id)
    await deleteDiagnosisRecordsForAthlete(id, athlete?.name, user?.id)
    setAthletes((current) => current.filter((item) => item.id !== id))
  }

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    void Promise.all([listAthletes(user.id), syncDiagnosisRecordsFromSupabase(user.id)]).then(([nextAthletes]) => {
      setAthletes(nextAthletes)
    })
  }, [isAuthenticated, user])

  const totalReports = athletes.reduce((sum, athlete) => sum + getDiagnosisStatsForAthlete(athlete.id, athlete.name).totalReports, 0)
  const activeAthletes = athletes.filter((athlete) => getDiagnosisStatsForAthlete(athlete.id, athlete.name).totalReports > 0).length

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-primary)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>

          <Link href="/analysis/new" className="action-primary text-sm">
            <Plus className="h-4 w-4" />
            新建分析
          </Link>
        </div>
      </header>

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_340px] lg:items-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_88%,transparent)] px-6 py-8 sm:px-8 sm:py-10">
            <div className="hero-orbit left-[-10%] top-[-18%] h-48 w-48 opacity-20" />
            <div className="hero-orbit bottom-[-20%] right-[-8%] h-52 w-52 opacity-20" />

            <div className="relative z-10 space-y-5">
              <div className="eyebrow text-[var(--accent)]">Athlete library</div>
              <h1 className="font-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.96] tracking-[-0.04em] text-[var(--text-primary)]">
                把运动员档案、历史报告和趋势放进同一张工作台
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                这里不是单纯的人名列表，而是你的长期观察入口。每个运动员的分析记录、平均表现和最佳状态都会逐步沉淀下来。
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile label="档案数" value={String(athletes.length)} />
                <MetricTile label="活跃档案" value={String(activeAthletes)} accent={activeAthletes > 0} />
                <MetricTile label="累计报告" value={String(totalReports)} />
              </div>
            </div>
          </div>

          <aside className="panel-elevated space-y-5 p-6">
            <div className="eyebrow">使用方式</div>
            <h2 className="font-display text-2xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
              先找人，再看历史，再补新样本
            </h2>
            <div className="space-y-3">
              <GuideCard title="档案是观察容器" description="每次分析都会沉淀到具体的人名下面，方便看长期变化。" />
              <GuideCard title="空状态也能继续推进" description="如果没有档案，直接从一次新分析开始，系统会自动帮你创建。" />
              <GuideCard title="先积累，再看趋势" description="样本越连续，档案页给出的判断就越稳定。 " />
            </div>
          </aside>
        </section>

        <section className="mx-auto mt-12 max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="eyebrow">档案列表</div>
              <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                最近的运动员档案
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                每张卡片都会优先展示报告数、平均分和最佳状态，帮助你快速找到值得继续跟进的人。
              </p>
            </div>

            <Link href="/analysis/new" className="action-secondary text-sm">
              <Plus className="h-4 w-4" />
              新建分析并沉淀档案
            </Link>
          </div>

          {isLoading ? (
            <div className="panel flex items-center gap-3 p-5 text-sm text-[var(--text-secondary)]">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
              正在整理运动员档案...
            </div>
          ) : athletes.length === 0 ? (
            <div className="panel flex flex-col items-start gap-4 p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line-accent)] bg-[var(--accent-dim)]">
                <User className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">还没有运动员档案</h3>
                <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  从第一次分析开始，系统会自动为你创建档案，并逐渐沉淀历史报告和长期观察信息。
                </p>
              </div>
              <Link href="/analysis/new" className="action-primary text-sm">
                <Plus className="h-4 w-4" />
                创建第一份分析
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {athletes.map((athlete) => (
                <AthleteCard key={athlete.id} athlete={athlete} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function AthleteCard({
  athlete,
  onDelete,
}: {
  athlete: AthleteProfile
  onDelete: (id: string) => void
}) {
  const stats = getDiagnosisStatsForAthlete(athlete.id, athlete.name)

  return (
    <div className="panel group flex h-full flex-col justify-between p-5 transition-sharp hover:border-[var(--line-accent)]">
      <div className="space-y-6">
        <Link href={`/athletes/${athlete.id}`} className="block">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xl font-semibold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
                {athlete.name}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {athlete.position}
                {athlete.team ? ` · ${athlete.team}` : ""}
              </div>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:translate-x-1 group-hover:text-[var(--accent)]" />
          </div>
        </Link>

        {stats.totalReports > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="报告" value={stats.totalReports} />
            <MiniMetric label="平均" value={stats.averageScore} accent={stats.averageScore >= 70} />
            <MiniMetric label="最佳" value={stats.bestScore} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line-default)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
            还没有历史分析。进入这个档案后可以继续补充比赛或训练数据。
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--line-default)] pt-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">档案管理</div>
        <button
          type="button"
          onClick={() => onDelete(athlete.id)}
          className="flex items-center gap-2 text-xs text-[var(--text-muted)] transition-sharp hover:text-[var(--negative)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
      </div>
    </div>
  )
}

function MiniMetric({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_86%,transparent)] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</div>
      <div className={cn("mt-2 text-xl font-semibold text-[var(--text-primary)]", accent ? "text-[var(--accent)]" : "")}>
        {value}
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="metric-card">
      <div className="eyebrow">{label}</div>
      <div className={cn("mt-3 text-3xl font-semibold tracking-[-0.04em]", accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
        {value}
      </div>
    </div>
  )
}

function GuideCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_84%,transparent)] p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}
