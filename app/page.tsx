"use client"

import { type ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
  FileText,
  LogOut,
  Plus,
  type LucideIcon,
  User,
  Zap,
} from "lucide-react"
import { InstallPrompt, IOSInstallHint } from "@/components/pwa/install-prompt"
import { useAuth } from "@/contexts/auth-context"
import { AthleteProfile, AthleteReportSummary, getAllReports, getAthletes, getAthleteStats } from "@/lib/athletes"
import { cn } from "@/lib/utils"

const quickEntries: Array<{
  href: string
  title: string
  description: string
  meta: string
  icon: LucideIcon
}> = [
  {
    href: "/analysis/new",
    title: "排球分析",
    description: "从比赛与训练输入开始，输出结构化判断、风险提示和下一步建议。",
    meta: "快速 / 专业双模式",
    icon: Plus,
  },
  {
    href: "/running",
    title: "跑步训练",
    description: "把周训练拆成强度、恢复和趋势，让你看清是不是练对了。",
    meta: "周视角追踪",
    icon: Activity,
  },
  {
    href: "/gym",
    title: "健身训练",
    description: "识别训练结构偏差、疲劳累积和动作安排是否真正指向目标。",
    meta: "结构与负荷检查",
    icon: Zap,
  },
  {
    href: "/athletes",
    title: "运动员档案",
    description: "集中查看档案、历史分析和表现变化，把零散记录变成长期资产。",
    meta: "资料与报告中心",
    icon: User,
  },
]

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

  const averageScore = reports.length
    ? Math.round(reports.reduce((total, report) => total + report.overallScore, 0) / reports.length)
    : null
  const bestScore = reports.length ? Math.max(...reports.map((report) => report.overallScore)) : null
  const activeAthletes = athletes.filter((athlete) => getAthleteStats(athlete.id).totalReports > 0).length
  const latestReport = reports[0] ?? null

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-primary)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="accent-glow flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-accent)] bg-[var(--bg-secondary)]">
              <BarChart3 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-[var(--text-tertiary)]">Athlete Insight</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Performance Lab</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] md:flex">
            <Link href="/analysis/new" className="transition-sharp hover:text-[var(--text-primary)]">
              新建分析
            </Link>
            <Link href="/athletes" className="transition-sharp hover:text-[var(--text-primary)]">
              运动员
            </Link>
            <Link href="/history" className="transition-sharp hover:text-[var(--text-primary)]">
              历史趋势
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <>
                <span className="hidden max-w-[220px] truncate text-sm text-[var(--text-secondary)] sm:inline">
                  {user?.displayName || user?.email}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm text-[var(--text-secondary)] transition-sharp hover:border-[var(--line-default)] hover:text-[var(--text-primary)]"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">退出</span>
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--accent)]">
                登录
              </Link>
            )}

            <Link href="/analysis/new" className="action-primary text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">新建分析</span>
              <span className="sm:hidden">分析</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-start">
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_88%,transparent)] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="hero-orbit left-[-14%] top-[-22%] h-56 w-56 opacity-30" />
            <div className="hero-orbit right-[-10%] top-12 h-40 w-40 opacity-20" />

            <div className="relative z-10 space-y-8">
              <div className="space-y-4">
                <div className="eyebrow text-[var(--accent)]">Performance Lab / Data-driven coaching</div>
                <h1 className="font-display max-w-4xl text-balance text-[clamp(2.7rem,8vw,5.8rem)] leading-[0.94] tracking-[-0.04em] text-[var(--text-primary)]">
                  把训练数据变成
                  <span className="block text-[var(--accent)]">清晰判断与下一步动作</span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                  Athlete Insight 面向通用用户提供专业、可读、可执行的运动表现分析。你输入比赛或训练数据，我们帮你整理重点、
                  识别问题，并把下一步训练方向讲清楚。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/analysis/new" className="action-primary">
                  开始新分析
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/athletes" className="action-secondary">
                  查看运动员档案
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="运动员档案"
                  value={String(athletes.length)}
                  note={athletes.length > 0 ? `${activeAthletes} 人已有历史记录` : "从第一份报告开始积累"}
                />
                <MetricCard
                  label="平均表现分"
                  value={averageScore === null ? "--" : String(averageScore)}
                  note={averageScore === null ? "暂无分析数据" : "基于最近 10 份分析"}
                  accent={averageScore !== null}
                />
                <MetricCard
                  label="最佳单次得分"
                  value={bestScore === null ? "--" : String(bestScore)}
                  note={bestScore === null ? "等待首份报告" : "帮助识别上限表现"}
                />
              </div>
            </div>
          </div>

          <aside className="panel-elevated relative overflow-hidden p-6 sm:p-8">
            <div className="hero-orbit bottom-[-22%] right-[-16%] h-56 w-56 opacity-20" />

            <div className="relative z-10 space-y-6">
              <div className="space-y-3">
                <div className="eyebrow">实时概览</div>
                <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                  专业判断，不必读一堆原始数据
                </h2>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  我们用更像报告而不是表格的方式组织信息，让普通用户也能快速理解表现、风险和建议。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatusCell label="分析模式" value="快速 + 专业" />
                <StatusCell label="覆盖项目" value="排球 / 跑步 / 健身" />
                <StatusCell label="核心输出" value="表现判断" />
                <StatusCell label="复盘重点" value="问题 + 计划" />
              </div>

              <div className="panel space-y-4 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="eyebrow">Latest report</div>
                    <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                      {latestReport ? latestReport.athleteName : "等待第一份分析"}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full border text-lg font-bold",
                      latestReport
                        ? "border-[var(--line-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "border-[var(--line-default)] text-[var(--text-secondary)]"
                    )}
                  >
                    {latestReport ? latestReport.overallScore : "--"}
                  </div>
                </div>

                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  {latestReport
                    ? `${latestReport.verdict} · ${formatReportDate(latestReport.createdAt)}`
                    : "先录入一次比赛或训练数据，系统就会生成清晰的表现判断与下一步建议。"}
                </p>

                <div className="surface-hairline" />

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <ProcessStep index="01" title="录入数据" description="比赛、跑步或健身信息都能进入统一结构。" />
                  <ProcessStep index="02" title="识别重点" description="系统自动提炼优势、薄弱点和关键风险。" />
                  <ProcessStep index="03" title="输出建议" description="把结果转成普通人也能执行的下一步动作。" />
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mx-auto mt-12 max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(240px,0.32fr)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-3">
              <div className="eyebrow">入口导航</div>
              <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                按你的场景进入，不用先学系统
              </h2>
              <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                不同模块用同一套视觉语言组织，让第一次进入的人也能迅速知道自己该从哪里开始。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickEntries.map((entry) => (
                <QuickEntryCard key={entry.href} {...entry} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-14 grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="运动员档案"
              title="把每个运动员的长期轨迹收进一个清晰视图"
              description="档案页不该只是数据堆积。这里先给你最近活跃对象和关键表现，方便马上进入复盘。"
              action={
                <Link href="/athletes" className="action-secondary text-sm">
                  查看全部档案
                </Link>
              }
            />

            {isLoading ? (
              <LoadingPanel label="正在整理运动员档案..." />
            ) : athletes.length === 0 ? (
              <EmptyState
                icon={<User className="h-6 w-6 text-[var(--accent)]" />}
                title="还没有运动员档案"
                description="从一次分析开始，系统会自动为你沉淀档案、历史报告和趋势信息。"
                href="/analysis/new"
                linkLabel="创建第一份分析"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {athletes.slice(0, 6).map((athlete) => (
                  <AthleteCard key={athlete.id} athlete={athlete} />
                ))}
              </div>
            )}
          </div>

          <aside className="panel space-y-5 p-6">
            <div className="eyebrow">系统特征</div>
            <h3 className="font-display text-2xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
              给普通用户的专业体验，关键在这三件事
            </h3>
            <div className="space-y-3">
              <InsightCard
                title="判断先于图表"
                description="先把发生了什么讲清楚，再展示分数和趋势，减轻第一次使用时的认知负担。"
              />
              <InsightCard
                title="空状态教你开始"
                description="没有数据时，不留白发呆，而是把下一步入口和价值说透。"
              />
              <InsightCard
                title="同一套视觉语言"
                description="从首页到分析页，保持一致的面板、强调色和层次，让产品更像一个系统。"
              />
            </div>
          </aside>
        </section>

        <section className="mx-auto mt-14 max-w-7xl">
          <SectionHeading
            eyebrow="最近报告"
            title="最近的判断，应该一眼就能找到重点"
            description="报告列表强化了分数、对象和结论的层次，让你在多个结果之间快速筛选。"
            action={
              reports.length > 0 ? (
                <div className="data-pill text-sm">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                  近 10 份报告
                </div>
              ) : null
            }
          />

          {isLoading ? (
            <LoadingPanel label="正在整理最近的报告..." />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6 text-[var(--accent)]" />}
              title="还没有分析报告"
              description="先完成一次比赛、跑步或健身分析，系统就会在这里汇总结果并形成长期记录。"
              href="/analysis/new"
              linkLabel="开始第一次分析"
            />
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          )}

          <div className="mt-8 panel grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="space-y-2">
              <div className="eyebrow">准备开始</div>
              <h3 className="font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)]">
                先录一份数据，系统会自动帮你搭出完整工作台
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                首页会随着分析积累不断长出更多上下文，所以第一份数据就是最关键的启动器。
              </p>
            </div>
            <Link href="/analysis/new" className="action-primary text-sm">
              立即开始
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <InstallPrompt />
        <IOSInstallHint />
      </main>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl space-y-3">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.4rem]">
          {title}
        </h2>
        <p className="text-sm leading-6 text-[var(--text-secondary)] sm:text-base">{description}</p>
      </div>
      {action}
    </div>
  )
}

function QuickEntryCard({
  href,
  title,
  description,
  meta,
  icon: Icon,
}: {
  href: string
  title: string
  description: string
  meta: string
  icon: LucideIcon
}) {
  return (
    <Link
      href={href}
      className="panel group flex h-full flex-col justify-between gap-6 p-5 transition-sharp hover:border-[var(--line-accent)] hover:bg-[color-mix(in_oklch,var(--bg-tertiary)_88%,transparent)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="data-pill text-xs uppercase tracking-[0.18em]">{meta}</div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line-default)] bg-[var(--bg-muted)] text-[var(--accent)] transition-sharp group-hover:border-[var(--line-accent)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xl font-semibold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
          {title}
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] transition-sharp group-hover:text-[var(--text-primary)]">
        <span>进入模块</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  )
}

function MetricCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div className="metric-card">
      <div className="eyebrow">{label}</div>
      <div className={cn("mt-3 text-3xl font-semibold tracking-[-0.04em]", accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
        {value}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{note}</p>
    </div>
  )
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_86%,transparent)] p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function ProcessStep({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_84%,transparent)] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{index}</div>
      <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}

function InsightCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_85%,transparent)] p-4">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="panel flex items-center gap-3 p-5 text-sm text-[var(--text-secondary)]">
      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
      {label}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  href,
  linkLabel,
}: {
  icon: ReactNode
  title: string
  description: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="panel flex flex-col items-start gap-4 p-6 sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line-accent)] bg-[var(--accent-dim)]">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
      <Link href={href} className="action-primary text-sm">
        {linkLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function AthleteCard({ athlete }: { athlete: AthleteProfile }) {
  const stats = getAthleteStats(athlete.id)

  return (
    <Link
      href={`/athletes/${athlete.id}`}
      className="panel group flex h-full flex-col gap-6 p-5 transition-sharp hover:border-[var(--line-accent)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
            {athlete.name}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            {athlete.position}
            {athlete.team ? ` · ${athlete.team}` : ""}
          </div>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:text-[var(--accent)]" />
      </div>

      {stats.totalReports > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="报告数" value={String(stats.totalReports)} />
          <StatTile label="平均分" value={String(stats.averageScore)} accent={stats.averageScore >= 70} />
          <StatTile label="最佳" value={String(stats.bestScore)} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--line-default)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          暂无历史分析，进入档案后可以继续补充该运动员的比赛或训练记录。
        </div>
      )}
    </Link>
  )
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_86%,transparent)] p-4">
      <div className="eyebrow">{label}</div>
      <div className={cn("mt-2 text-xl font-semibold", accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
        {value}
      </div>
    </div>
  )
}

function ReportRow({ report }: { report: AthleteReportSummary }) {
  return (
    <Link
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
            {report.athleteName}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">{report.verdict}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="data-pill text-xs uppercase tracking-[0.18em]">{formatReportDate(report.createdAt)}</div>
        <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:text-[var(--accent)]" />
      </div>
    </Link>
  )
}

function formatReportDate(date: string) {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })
}
