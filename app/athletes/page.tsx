"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Plus, Trash2, User } from "lucide-react"
import { AthleteProfile, deleteAthlete, deleteAthleteReports, getAthleteStats, getAthletes } from "@/lib/athletes"
import { cn } from "@/lib/utils"

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setAthletes(getAthletes())
    setIsLoading(false)
  }, [])

  const handleDelete = (id: string) => {
    const confirmed = window.confirm("确定要删除这位运动员吗？相关分析报告也会一并删除。")
    if (!confirmed) return

    deleteAthlete(id)
    deleteAthleteReports(id)
    setAthletes(getAthletes())
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--line-default)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm tracking-wide">返回</span>
          </Link>

          <Link
            href="/analysis/new"
            className="flex items-center gap-2 bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg-primary)] transition-sharp hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            新建分析
          </Link>
        </div>
      </nav>

      <main className="pt-14">
        <section className="px-6 pb-8 pt-16">
          <div className="mx-auto max-w-7xl">
            <div className="editorial-title mb-4 text-[var(--accent)]">ATHLETES</div>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-5xl">运动员档案</h1>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-7xl">
            {isLoading ? (
              <div className="text-[var(--text-muted)]">加载中...</div>
            ) : athletes.length === 0 ? (
              <div className="border border-dashed border-[var(--line-strong)] p-12 text-center">
                <User className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)]" />
                <p className="mb-4 text-[var(--text-muted)]">还没有运动员档案</p>
                <Link
                  href="/analysis/new"
                  className="inline-flex items-center gap-2 bg-[var(--accent)] px-4 py-2 font-bold text-[var(--bg-primary)]"
                >
                  <Plus className="h-4 w-4" />
                  创建第一个分析
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {athletes.map((athlete) => (
                  <AthleteCard key={athlete.id} athlete={athlete} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
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
  const stats = getAthleteStats(athlete.id)

  return (
    <div className="group panel">
      <Link href={`/athletes/${athlete.id}`} className="block p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="font-bold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
              {athlete.name}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {athlete.position}
              {athlete.team ? ` // ${athlete.team}` : ""}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:text-[var(--accent)]" />
        </div>

        {stats.totalReports > 0 ? (
          <div className="grid grid-cols-3 gap-4 border-t border-[var(--line-default)] pt-4">
            <Metric label="报告" value={stats.totalReports} />
            <Metric
              label="平均"
              value={stats.averageScore}
              className={cn(stats.averageScore >= 70 ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}
            />
            <Metric label="最佳" value={stats.bestScore} />
          </div>
        ) : (
          <div className="border-t border-[var(--line-default)] pt-4 text-sm text-[var(--text-muted)]">暂无分析报告</div>
        )}
      </Link>

      <div className="px-5 pb-4">
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

function Metric({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</div>
      <div className={cn("text-lg font-bold text-[var(--text-primary)]", className)}>{value}</div>
    </div>
  )
}
