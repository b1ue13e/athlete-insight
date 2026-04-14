"use client"

import { type ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { Activity, BarChart3, ChevronRight, FileText, LogOut, Plus, User, Zap } from "lucide-react"
import { InstallPrompt, IOSInstallHint } from "@/components/pwa/install-prompt"
import { useAuth } from "@/contexts/auth-context"
import { AthleteProfile, AthleteReportSummary, getAllReports, getAthletes, getAthleteStats } from "@/lib/athletes"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [reports, setReports] = useState<AthleteReportSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadedAthletes = getAthletes()
    const storedReports = getAllReports()
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setAthletes(loadedAthletes)
    setReports(storedReports.slice(0, 10))
    setIsLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--line-default)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-[var(--accent)]">
              <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <span className="text-sm font-bold tracking-wider text-[var(--text-primary)]">ATHLETE INSIGHT</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-[var(--text-muted)]">{user?.displayName || user?.email}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-muted)] transition-sharp hover:text-[var(--text-primary)]"
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm text-[var(--text-muted)] transition-sharp hover:text-[var(--accent)]"
              >
                登录
              </Link>
            )}
            <Link
              href="/analysis/new"
              className="flex items-center gap-2 bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--bg-primary)] transition-sharp hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              新建分析
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-14">
        <section className="px-6 pb-12 pt-16">
          <div className="mx-auto max-w-7xl">
            <div className="editorial-title mb-4 text-[var(--accent)]">Performance Lab</div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-[var(--text-primary)] lg:text-6xl">
              运动员表现分析
            </h1>
            <p className="max-w-2xl text-lg text-[var(--text-secondary)]">
              基于比赛与训练数据生成专业分析报告，帮助你客观评估表现、发现问题，并制定下一步训练计划。
            </p>
          </div>
        </section>

        <section className="px-6 pb-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <QuickEntry
                href="/analysis/new"
                title="排球分析"
                description="比赛表现分析报告，支持快速模式和专业模式。"
                icon={<Plus className="h-6 w-6 text-[var(--accent)]" />}
              />
              <QuickEntry
                href="/running"
                title="跑步训练"
                description="判断是否练对了，并从周视角管理训练进步。"
                icon={<Activity className="h-6 w-6 text-[var(--accent)]" />}
              />
              <QuickEntry
                href="/gym"
                title="健身训练"
                description="识别训练结构偏差、疲劳风险和是否真正练到点上。"
                icon={<Zap className="h-6 w-6 text-[var(--accent)]" />}
              />
              <QuickEntry
                href="/athletes"
                title="管理运动员"
                description="查看档案、训练趋势和历史报告。"
                icon={<User className="h-6 w-6 text-[var(--accent)]" />}
              />
            </div>
          </div>
        </section>

        <section className="px-6 pb-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">运动员档案</h2>
              <Link
                href="/athletes"
                className="text-sm text-[var(--text-muted)] transition-sharp hover:text-[var(--accent)]"
              >
                查看全部 →
              </Link>
            </div>

            {isLoading ? (
              <div className="text-[var(--text-muted)]">加载中...</div>
            ) : athletes.length === 0 ? (
              <div className="border border-dashed border-[var(--line-strong)] p-8 text-center">
                <User className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-[var(--text-muted)]">还没有运动员档案</p>
                <Link href="/analysis/new" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
                  创建第一个分析 →
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {athletes.map((athlete) => (
                  <AthleteCard key={athlete.id} athlete={athlete} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">最近报告</h2>
              {reports.length > 0 ? <span className="text-sm text-[var(--text-muted)]">共 {reports.length} 份</span> : null}
            </div>

            {isLoading ? (
              <div className="text-[var(--text-muted)]">加载中...</div>
            ) : reports.length === 0 ? (
              <div className="border border-dashed border-[var(--line-strong)] p-8 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-[var(--text-muted)]">还没有分析报告</p>
                <Link href="/analysis/new" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
                  开始第一次分析 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>
        </section>

        <InstallPrompt />
        <IOSInstallHint />
      </main>
    </div>
  )
}

function QuickEntry({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <Link href={href} className="group border border-[var(--line-default)] p-6 transition-sharp hover:border-[var(--accent)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xl font-bold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
            {title}
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        {icon}
      </div>
    </Link>
  )
}

function AthleteCard({ athlete }: { athlete: AthleteProfile }) {
  const stats = getAthleteStats(athlete.id)

  return (
    <Link
      href={`/athletes/${athlete.id}`}
      className="group border border-[var(--line-default)] p-5 transition-sharp hover:border-[var(--accent)]"
    >
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
        <div className="grid grid-cols-2 gap-4 border-t border-[var(--line-default)] pt-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">报告数</div>
            <div className="text-lg font-bold text-[var(--text-primary)]">{stats.totalReports}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">平均分</div>
            <div
              className={cn(
                "text-lg font-bold",
                stats.averageScore >= 70 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
              )}
            >
              {stats.averageScore}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-[var(--line-default)] pt-4 text-sm text-[var(--text-muted)]">暂无分析报告</div>
      )}
    </Link>
  )
}

function ReportRow({ report }: { report: AthleteReportSummary }) {
  const date = new Date(report.createdAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })

  return (
    <Link
      href={`/analysis/${report.id}`}
      className="group flex items-center justify-between border border-[var(--line-default)] p-4 transition-sharp hover:border-[var(--accent)]"
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center border",
            report.overallScore >= 70
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--line-strong)] text-[var(--text-secondary)]"
          )}
        >
          <span className="text-lg font-bold">{report.overallScore}</span>
        </div>

        <div>
          <div className="font-medium text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
            {report.athleteName}
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {report.verdict} · {date}
          </div>
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:text-[var(--accent)]" />
    </Link>
  )
}
