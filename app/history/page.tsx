"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, BarChart3, CheckCircle2, ChevronRight, Clock3, Layers3, Target, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { getAnalysisDebugBundle, type AnalysisDebugBundle } from "@/lib/analysis/debug-bundle"
import { getDiagnosisSummaries, syncDiagnosisRecordsFromSupabase, type DiagnosisRecordSummary } from "@/lib/analysis/store"

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth()
  const [records, setRecords] = useState<DiagnosisRecordSummary[]>([])
  const [debugBundles, setDebugBundles] = useState<Record<string, AnalysisDebugBundle>>({})

  useEffect(() => {
    setRecords(getDiagnosisSummaries())
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    void syncDiagnosisRecordsFromSupabase(user.id).then(() => {
      setRecords(getDiagnosisSummaries())
    })
  }, [isAuthenticated, user])

  useEffect(() => {
    let cancelled = false
    const targets = records.slice(0, 8)
    if (targets.length === 0) {
      setDebugBundles({})
      return
    }

    void Promise.all(
      targets.map(async (record) => [
        record.id,
        await getAnalysisDebugBundle({
          analysisSessionId: record.analysisSessionId,
          fallbackSessionId: record.id,
          sport: record.sport,
        }),
      ] as const)
    ).then((entries) => {
      if (!cancelled) {
        setDebugBundles(Object.fromEntries(entries))
      }
    })

    return () => {
      cancelled = true
    }
  }, [records])

  const dashboard = useMemo(() => {
    const latestFive = records.slice(0, 5)
    const previousFive = records.slice(5, 10)

    const average = (items: DiagnosisRecordSummary[]) =>
      items.length ? Math.round(items.reduce((total, item) => total + item.overallScore, 0) / items.length) : null

    const latestAverage = average(latestFive)
    const previousAverage = average(previousFive)

    return {
      latestAverage,
      previousAverage,
      averageChange:
        latestAverage !== null && previousAverage !== null ? latestAverage - previousAverage : null,
      bestScore: records.length ? Math.max(...records.map((item) => item.overallScore)) : null,
      helpfulCount: records.filter((item) => item.feedback === "helpful").length,
      missedCount: records.filter((item) => item.feedback === "missed").length,
      bySport: {
        running: records.filter((item) => item.sport === "running").length,
        gym: records.filter((item) => item.sport === "gym").length,
        volleyball: records.filter((item) => item.sport === "volleyball").length,
      },
    }
  }, [records])

  if (records.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
        <div className="max-w-xl space-y-4 text-center">
          <div className="text-sm uppercase tracking-[0.24em] text-[var(--text-tertiary)]">History</div>
          <h1 className="font-display text-4xl tracking-[-0.04em] text-[var(--text-primary)]">还没有形成诊断时间线</h1>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            先完成一份跑步或健身诊断，历史页就会开始记录你的分数、纠偏重点和“判断准不准”的反馈。
          </p>
          <Link href="/analysis/new/running" className="action-primary inline-flex text-sm">
            开始第一份诊断
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-primary)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Diagnosis history</div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_88%,transparent)] px-6 py-8 sm:px-8 sm:py-10">
            <div className="hero-orbit left-[-10%] top-[-18%] h-52 w-52 opacity-20" />
            <div className="relative z-10 space-y-6">
              <div className="eyebrow text-[var(--accent)]">Recent trajectory</div>
              <h1 className="font-display text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.94] tracking-[-0.04em]">
                不只是历史列表
                <span className="block text-[var(--accent)]">而是你的纠偏轨迹</span>
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                每份诊断都会把“这次为什么这样判断”和“下次最该怎么改”留下来。历史页的任务，是让你判断自己是不是正在稳定变好。
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="已保存诊断" value={String(records.length)} note="全部进入统一时间线" />
                <MetricCard label="最新 5 次均分" value={dashboard.latestAverage === null ? "--" : String(dashboard.latestAverage)} note={dashboard.averageChange === null ? "还没有足够数据对比" : `较前 5 次 ${dashboard.averageChange >= 0 ? "+" : ""}${dashboard.averageChange}`} accent={dashboard.averageChange !== null && dashboard.averageChange >= 0} />
                <MetricCard label="历史最好分" value={dashboard.bestScore === null ? "--" : String(dashboard.bestScore)} note="用于识别你的上限表现" />
              </div>
            </div>
          </div>

          <aside className="panel-elevated space-y-5 p-6">
            <div className="eyebrow">反馈闭环</div>
            <h2 className="font-display text-2xl tracking-[-0.03em] text-[var(--text-primary)]">
              现在开始积累“判断准不准”
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatusCell icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="判断靠谱" value={String(dashboard.helpfulCount)} />
              <StatusCell icon={<XCircle className="h-4 w-4 text-rose-500" />} label="还不够准" value={String(dashboard.missedCount)} />
            </div>

            <div className="space-y-3">
              <InsightCard title="跑步主线" description={`已保存 ${dashboard.bySport.running} 份，适合做周复盘和持续回访。`} />
              <InsightCard title="健身深度诊断" description={`已保存 ${dashboard.bySport.gym} 份，更适合观察结构与疲劳。`} />
              <InsightCard title="专项模式" description={`已保存 ${dashboard.bySport.volleyball} 份，用于承接排球等专业场景。`} />
            </div>
          </aside>
        </section>

        <section className="mt-14 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">全部记录</div>
              <h2 className="font-display text-3xl tracking-[-0.03em] text-[var(--text-primary)]">最近的判断、反馈和入口</h2>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">点击任一诊断可以继续查看证据链、风险和下次动作，也可以直接补充反馈。</p>
            </div>
            <Link href="/analysis/new/running" className="action-secondary text-sm">
              再做一次诊断
            </Link>
          </div>

          <div className="space-y-3">
            {records.map((record) => (
              <Link
                key={record.id}
                href={`/analysis/${record.id}`}
                className="panel group flex flex-col gap-4 p-4 transition-sharp hover:border-[var(--line-accent)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-lg font-bold ${
                      record.overallScore >= 70
                        ? "border-[var(--line-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "border-[var(--line-default)] bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {record.overallScore}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-[var(--text-primary)] transition-sharp group-hover:text-[var(--accent)]">
                        {record.title}
                      </div>
                      <Badge variant="outline">{record.sport}</Badge>
                      <Badge variant="secondary">{record.rangeLabel}</Badge>
                      {record.feedback ? (
                        <Badge variant={record.feedback === "helpful" ? "default" : "destructive"}>
                          {record.feedback === "helpful" ? "判断靠谱" : "还不够准"}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">{record.verdict}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {new Date(record.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    可信度 {record.confidenceLabel}
                  </div>
                  <ChevronRight className="h-4 w-4 transition-sharp group-hover:text-[var(--accent)]" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 space-y-6">
          <div className="space-y-2">
            <div className="eyebrow">Debug view</div>
            <h2 className="font-display text-3xl tracking-[-0.03em] text-[var(--text-primary)]">Diagnosis + Session + Enhancement 联合视图</h2>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              这里不是给普通用户看的，而是为了确认每条 diagnosis 是否已经正确挂到 analysis_session，并补齐专项增强层。
            </p>
          </div>

          <div className="grid gap-4">
            {records.slice(0, 8).map((record) => {
              const bundle = debugBundles[record.id]
              const readyLayers = bundle?.layers.filter((layer) => layer.available).length ?? 0
              return (
                <div key={`debug-${record.id}`} className="panel space-y-4 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold">{record.title}</div>
                        <Badge variant="outline">{record.sport}</Badge>
                        <Badge variant={bundle?.session ? "default" : "secondary"}>{bundle?.session ? "session linked" : "session missing"}</Badge>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        diagnosis={record.id}
                        {record.analysisSessionId ? ` · analysis_session=${record.analysisSessionId}` : " · analysis_session=missing"}
                      </div>
                    </div>
                    <Link href={`/analysis/${record.id}`} className="action-secondary text-sm">
                      打开详情联调
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <DebugCell label="Diagnosis" value="ready" accent />
                    <DebugCell label="Session trunk" value={bundle?.session ? bundle.session.input_method : "missing"} />
                    <DebugCell label="Enhancement layers" value={`${readyLayers}/${bundle?.layers.length ?? 0}`} />
                    <DebugCell label="Feedback" value={record.feedback ?? "pending"} />
                  </div>

                  {bundle?.layers.length ? (
                    <div className="grid gap-3 xl:grid-cols-3">
                      {bundle.layers.map((layer) => (
                        <div key={layer.key} className="rounded-2xl border p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">{layer.label}</div>
                            <div className="data-pill text-[10px] uppercase tracking-[0.18em]">{layer.available ? layer.source : "missing"}</div>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{layer.summary}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">
                      当前还没有读到专项增强层，可能是旧记录、未执行 migration，或者该记录尚未重新保存。
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function MetricCard({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className="metric-card">
      <div className="eyebrow">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-[-0.04em] ${accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{note}</p>
    </div>
  )
}

function StatusCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_86%,transparent)] p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function InsightCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_85%,transparent)] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}

function DebugCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--line-default)] bg-[color-mix(in_oklch,var(--bg-secondary)_86%,transparent)] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {accent ? <Layers3 className="h-3.5 w-3.5 text-[var(--accent)]" /> : null}
        {label}
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  )
}
