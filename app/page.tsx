"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Activity, ArrowRight, BarChart3, ChevronRight, FileText, LogOut, Plus, type LucideIcon, User, Zap } from "lucide-react"
import { InstallPrompt, IOSInstallHint } from "@/components/pwa/install-prompt"
import { useAuth } from "@/contexts/auth-context"
import { AthleteProfile, listAthletes } from "@/lib/athletes"
import { getDiagnosisSummaries, syncDiagnosisRecordsFromSupabase, type DiagnosisRecordSummary } from "@/lib/analysis/store"
import { cn } from "@/lib/utils"

const primaryActions: Array<{
  href: string
  title: string
  description: string
  meta: string
  icon: LucideIcon
}> = [
  {
    href: "/analysis/new/running",
    title: "开始跑步诊断",
    description: "先判断这次有没有练对，再把最该修正的重点带回下一次训练。",
    meta: "主入口 / 高频回访",
    icon: Activity,
  },
  {
    href: "/analysis/running/weekly",
    title: "查看本周复盘",
    description: "把单次训练放回周结构里，看强度、恢复和节奏是不是正在变好。",
    meta: "周视角 / 留存核心",
    icon: FileText,
  },
  {
    href: "/analysis/new/gym",
    title: "开始健身诊断",
    description: "判断今天的训练有没有真正服务目标，而不是只留下疲劳感。",
    meta: "第二主线 / 深度诊断",
    icon: Zap,
  },
]

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecordSummary[]>([])

  useEffect(() => {
    void listAthletes(user?.id).then(setAthletes)
    setDiagnoses(getDiagnosisSummaries())
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

  const latestDiagnosis = diagnoses[0] ?? null
  const averageScore = diagnoses.length
    ? Math.round(diagnoses.reduce((total, item) => total + item.overallScore, 0) / diagnoses.length)
    : null

  const rememberedValue = useMemo(() => {
    if (!latestDiagnosis) return "先完成一次诊断"
    return latestDiagnosis.rangeLabel
  }, [latestDiagnosis])

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
              <div className="text-sm font-semibold text-[var(--text-primary)]">Training Diagnosis Lab</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] md:flex">
            <Link href="/analysis/new/running" className="transition-sharp hover:text-[var(--text-primary)]">
              开始诊断
            </Link>
            <Link href="/analysis/running/weekly" className="transition-sharp hover:text-[var(--text-primary)]">
              本周复盘
            </Link>
            <Link href="/history" className="transition-sharp hover:text-[var(--text-primary)]">
              历史与趋势
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

            <Link href="/analysis/new/running" className="action-primary text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">开始诊断</span>
              <span className="sm:hidden">诊断</span>
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
                <div className="eyebrow text-[var(--accent)]">Training diagnosis / correction loop</div>
                <h1 className="font-display max-w-4xl text-balance text-[clamp(2.7rem,8vw,5.8rem)] leading-[0.94] tracking-[-0.04em] text-[var(--text-primary)]">
                  不是记录训练
                  <span className="block text-[var(--accent)]">而是持续纠偏训练</span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                  你输入一次训练，我们先判断有没有练对，再给出证据、风险和下次最该改的动作；等你再次回来时，再用复盘验证你有没有真的改对。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/analysis/new/running" className="action-primary">
                  开始一次跑步诊断
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/analysis/running/weekly" className="action-secondary">
                  查看本周复盘
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="已保存诊断" value={String(diagnoses.length)} note={diagnoses.length > 0 ? "每一次都可以变成长期复盘素材" : "从第一份诊断开始积累"} />
                <MetricCard label="平均得分" value={averageScore === null ? "--" : String(averageScore)} note={averageScore === null ? "还没有诊断数据" : "基于全部已保存诊断"} accent={averageScore !== null} />
                <MetricCard label="当前记忆点" value={rememberedValue} note={latestDiagnosis ? latestDiagnosis.title : "系统会帮你记住最该修正的重点"} />
              </div>
            </div>
          </div>

          <aside className="panel-elevated relative overflow-hidden p-6 sm:p-8">
            <div className="hero-orbit bottom-[-22%] right-[-16%] h-56 w-56 opacity-20" />

            <div className="relative z-10 space-y-6">
              <div className="space-y-3">
                <div className="eyebrow">主线闭环</div>
                <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                  先判断，再修正，再回来验证
                </h2>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  首页不再像功能目录，而是只服务三件事：开始一次诊断、查看周复盘、检查上次建议这次有没有做到。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatusCell label="主增长模块" value="跑步训练" />
                <StatusCell label="深度模块" value="健身训练" />
                <StatusCell label="专项入口" value="排球分析" />
                <StatusCell label="产品核心" value="诊断与纠偏" />
              </div>

              <div className="panel space-y-4 p-5">
                <div className="eyebrow">Latest diagnosis</div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {latestDiagnosis ? latestDiagnosis.title : "等待第一份诊断"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {latestDiagnosis ? latestDiagnosis.verdict : "先完成一次训练诊断，系统就会开始记住你的纠偏轨迹。"}
                    </p>
                  </div>
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-full border text-lg font-bold", latestDiagnosis ? "border-[var(--line-accent)] bg-[var(--accent-dim)] text-[var(--accent)]" : "border-[var(--line-default)] text-[var(--text-secondary)]")}>
                    {latestDiagnosis ? latestDiagnosis.overallScore : "--"}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <ProcessStep index="01" title="判断有没有练对" description="先给结论，而不是先堆图表。" />
                  <ProcessStep index="02" title="记住下次修正点" description="把最该改的动作留下来，避免看完就结束。" />
                  <ProcessStep index="03" title="回到复盘验证" description="下次回来时，继续对照你有没有真的纠偏。" />
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mx-auto mt-12 max-w-7xl">
          <SectionHeading
            eyebrow="今天最值得做的动作"
            title="先做最能形成回访闭环的事"
            description="优先从跑步诊断进入，再查看周复盘；健身负责更深的结构诊断，专项模式保留给专业场景。"
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {primaryActions.map((entry) => (
              <QuickEntryCard key={entry.href} {...entry} />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-14 grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="最近的诊断"
              title="最新判断应该一眼找到重点"
              description="这里不只是列记录，而是让你快速看到最近一次判断、得分、可信度和下一步入口。"
            />

            {diagnoses.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6 text-[var(--accent)]" />}
                title="还没有保存的诊断"
                description="先完成一次跑步或健身诊断，这里就会开始形成你自己的纠偏时间线。"
                href="/analysis/new/running"
                linkLabel="先做第一份诊断"
              />
            ) : (
              <div className="space-y-3">
                {diagnoses.slice(0, 8).map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>

          <aside className="panel space-y-5 p-6">
            <div className="eyebrow">辅助资产</div>
            <h3 className="font-display text-2xl leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
              运动员档案仍然重要，但不再压过主任务
            </h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              档案、历史、专项模式都保留，但它们服务的是“更稳定地做诊断与复盘”，不是把首页变成功能地图。
            </p>

            <div className="space-y-3">
              <InsightCard title="本地档案数" description={`当前共 ${athletes.length} 份本地运动员档案，可继续用于排球或专项分析。`} />
              <InsightCard title="历史趋势" description="所有已保存诊断都会进入统一历史页，后续会继续接上更完整的反馈和趋势层。" />
              <InsightCard title="教练反馈" description="每份诊断都可以直接标记“判断靠谱 / 还不够准”，用于持续校准产品判断方式。" />
            </div>

            <Link href="/athletes" className="action-secondary text-sm">
              查看运动员档案
            </Link>
          </aside>
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
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-2xl space-y-3">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.4rem]">
        {title}
      </h2>
      <p className="text-sm leading-6 text-[var(--text-secondary)] sm:text-base">{description}</p>
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
        <span>进入</span>
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

function ReportRow({ report }: { report: DiagnosisRecordSummary }) {
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
            {report.title}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">{report.verdict}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="data-pill text-xs uppercase tracking-[0.18em]">
          {new Date(report.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
        </div>
        <ChevronRight className="h-5 w-5 text-[var(--text-muted)] transition-sharp group-hover:text-[var(--accent)]" />
      </div>
    </Link>
  )
}
