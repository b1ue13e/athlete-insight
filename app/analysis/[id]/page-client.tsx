"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ChevronRight,
  Download,
  Layers3,
  PlayCircle,
  Trash2,
} from "lucide-react"
import { DiagnosisReportShell } from "@/components/report/diagnosis-report-shell"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import type { ReportData } from "@/lib/report-engine"
import { getAnalysisDebugBundle, type AnalysisDebugBundle } from "@/lib/analysis/debug-bundle"
import {
  fetchDiagnosisRecordFromSupabase,
  getDiagnosisRecord,
  persistDiagnosisFeedback,
  removeDiagnosisRecordEverywhere,
  saveLegacyDiagnosisReport,
  type DiagnosisRecord,
} from "@/lib/analysis/store"

function continueLinkForSport(sport: DiagnosisRecord["sport"]) {
  switch (sport) {
    case "running":
      return { href: "/analysis/new/running", label: "再做一次跑步诊断" }
    case "gym":
      return { href: "/analysis/new/gym", label: "再做一次健身诊断" }
    default:
      return { href: "/analysis/new", label: "再做一次排球诊断" }
  }
}

export function ReportPageClient({ id }: { id: string }) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [record, setRecord] = useState<DiagnosisRecord | null>(null)
  const [debugBundle, setDebugBundle] = useState<AnalysisDebugBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const existing = getDiagnosisRecord(id)
      if (existing) {
        if (!cancelled) {
          setRecord(existing)
          setLoading(false)
        }
        return
      }

      if (typeof window !== "undefined") {
        const legacy = window.localStorage.getItem(`report_${id}`)
        if (legacy) {
          try {
            await saveLegacyDiagnosisReport(JSON.parse(legacy) as ReportData, user?.id)
            if (!cancelled) {
              setRecord(getDiagnosisRecord(id))
              setLoading(false)
            }
            return
          } catch {
            // keep trying remote fallback below
          }
        }
      }

      if (isAuthenticated && user) {
        const remoteRecord = await fetchDiagnosisRecordFromSupabase(user.id, id)
        if (!cancelled) {
          setRecord(remoteRecord)
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setRecord(null)
        setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated, user])

  useEffect(() => {
    if (!record) {
      setDebugBundle(null)
      return
    }

    let cancelled = false
    void getAnalysisDebugBundle({
      analysisSessionId: record.analysisSessionId,
      fallbackSessionId: record.id,
      sport: record.sport,
    }).then((bundle) => {
      if (!cancelled) {
        setDebugBundle(bundle)
      }
    })

    return () => {
      cancelled = true
    }
  }, [record])

  if (loading) {
    return (
      <WorkspaceShell title="诊断详情" subtitle="正在读取报告..." eyebrow="Diagnosis detail">
        <div className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] px-5 py-8 text-sm text-[var(--text-secondary)]">
          正在读取这份诊断，请稍候...
        </div>
      </WorkspaceShell>
    )
  }

  if (!record) {
    return (
      <WorkspaceShell title="诊断详情" subtitle="未找到该报告" eyebrow="Diagnosis detail" actions={<Link href="/history" className="action-secondary text-sm">返回历史</Link>}>
        <div className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] px-6 py-10 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[var(--text-secondary)]" />
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">这份诊断不存在</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            它可能已经被删除，或者还没有完成保存。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/history" className="action-primary text-sm">返回诊断历史</Link>
            <Link href="/analysis/new" className="action-secondary text-sm">新建诊断</Link>
          </div>
        </div>
      </WorkspaceShell>
    )
  }

  const continuation = continueLinkForSport(record.sport)

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `diagnosis-${record.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    await removeDiagnosisRecordEverywhere(record.id, user?.id)
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`report_${record.id}`)
    }
    router.push("/history")
  }

  return (
    <WorkspaceShell
      title={record.title}
      subtitle={`${record.athleteName} · ${new Date(record.createdAt).toLocaleString("zh-CN")}`}
      eyebrow="Diagnosis detail"
      actions={
        <>
          <button type="button" onClick={exportReport} className="action-secondary text-sm">
            <Download className="h-4 w-4" />
            导出 JSON
          </button>
          <button type="button" onClick={handleDelete} className="action-secondary text-sm text-[#ff8b78]">
            <Trash2 className="h-4 w-4" />
            删除
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{record.athleteName}</Badge>
                <Badge variant="secondary">{record.canonicalReport.meta.sport}</Badge>
                <Badge variant="outline">{record.canonicalReport.scoreOverview.rangeLabel}</Badge>
                <Badge variant={record.feedback === "helpful" ? "default" : record.feedback === "missed" ? "destructive" : "outline"}>
                  {record.feedback === "helpful" ? "判断靠谱" : record.feedback === "missed" ? "待修正" : "未反馈"}
                </Badge>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{record.canonicalReport.scoreOverview.verdict}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[340px]">
              <SummaryBox label="Final score" value={String(record.canonicalReport.scoreOverview.finalScore)} note={record.canonicalReport.confidence.label} />
              <SummaryBox label="Version" value={record.canonicalReport.meta.version} note={record.source === "pipeline" ? "Unified pipeline" : "Legacy migration"} />
            </div>
          </div>
        </section>

        <Tabs defaultValue="report" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="bg-[var(--bg-secondary)]">
              <TabsTrigger value="report">诊断结果</TabsTrigger>
              <TabsTrigger value="context">上下文</TabsTrigger>
              <TabsTrigger value="debug">调试</TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap gap-3">
              <Link href={continuation.href} className="action-primary text-sm">
                <PlayCircle className="h-4 w-4" />
                {continuation.label}
              </Link>
              {record.sport === "running" ? (
                <Link href="/analysis/running/weekly" className="action-secondary text-sm">
                  周复盘
                </Link>
              ) : null}
            </div>
          </div>

          <TabsContent value="report" className="mt-0 space-y-6">
            <DiagnosisReportShell
              report={record.canonicalReport}
              feedbackStorageKey={record.id}
              initialFeedback={record.feedback ?? null}
              onFeedbackChange={(value) => {
                void persistDiagnosisFeedback(record.id, value, user?.id)
                setRecord((current) => (current ? { ...current, feedback: value } : current))
              }}
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="dashboard-card border-[var(--line-default)] shadow-none">
                <CardHeader>
                  <CardDescription className="eyebrow">Next</CardDescription>
                  <CardTitle className="text-3xl text-[var(--text-primary)]">继续下一次动作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    这份报告不是为了“看完”。它真正有用的地方，是把最该修正的点带回下一次训练，再回来验证你有没有真的改对。
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href={continuation.href} className="dashboard-list-row group">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{continuation.label}</div>
                        <div className="text-xs text-[var(--text-secondary)]">继续这一条主线</div>
                      </div>
                      <PlayCircle className="h-4 w-4 text-[var(--accent)]" />
                    </Link>
                    {record.sport === "running" ? (
                      <Link href="/analysis/running/weekly" className="dashboard-list-row group">
                        <div>
                          <div className="text-sm font-semibold text-[var(--text-primary)]">查看跑步周复盘</div>
                          <div className="text-xs text-[var(--text-secondary)]">把单次判断放回周节奏里</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition-sharp group-hover:text-[var(--accent)]" />
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="dashboard-card border-[var(--line-default)] shadow-none">
                <CardHeader>
                  <CardDescription className="eyebrow">Snapshot</CardDescription>
                  <CardTitle className="text-3xl text-[var(--text-primary)]">诊断快照</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <MetaRow label="Session date" value={record.sessionDate} />
                  <MetaRow label="Source" value={record.source === "pipeline" ? "Unified pipeline" : "Legacy migration"} />
                  <MetaRow label="Confidence" value={record.canonicalReport.confidence.label} />
                  <MetaRow label="Objective" value={record.canonicalReport.inputSummary.objective ?? "未单独标注"} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="context" className="mt-0">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="dashboard-card border-[var(--line-default)] shadow-none">
                <CardHeader>
                  <CardDescription className="eyebrow">Meta</CardDescription>
                  <CardTitle className="text-3xl text-[var(--text-primary)]">诊断元信息</CardTitle>
                  <CardDescription className="text-sm leading-6 text-[var(--text-secondary)]">
                    适合回看这份判断来自哪里、版本是什么、当前反馈是什么。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <ContextBox label="标题" value={record.title} />
                  <ContextBox label="运动" value={record.canonicalReport.meta.sport} />
                  <ContextBox label="报告版本" value={record.canonicalReport.meta.version} />
                  <ContextBox label="记录时间" value={new Date(record.createdAt).toLocaleString("zh-CN")} />
                  <ContextBox label="当前反馈" value={record.feedback === "helpful" ? "判断靠谱" : record.feedback === "missed" ? "还不够准" : "未反馈"} />
                  <ContextBox label="记录来源" value={record.source === "pipeline" ? "Unified pipeline" : "Legacy migration"} />
                </CardContent>
              </Card>

              <Card className="dashboard-card border-[var(--line-default)] shadow-none">
                <CardHeader>
                  <CardDescription className="eyebrow">Confidence</CardDescription>
                  <CardTitle className="text-3xl text-[var(--text-primary)]">阅读前提</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                    {record.canonicalReport.confidence.summary}
                  </div>
                  {record.canonicalReport.confidence.caveats.map((item) => (
                    <div key={item} className="dashboard-list-row">
                      <div className="text-sm text-[var(--text-primary)]">{item}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="debug" className="mt-0">
            <Card className="dashboard-card border-[var(--line-default)] shadow-none">
              <CardHeader>
                <CardDescription className="eyebrow">Debug</CardDescription>
                <CardTitle className="flex items-center gap-2 text-3xl text-[var(--text-primary)]">
                  <Layers3 className="h-5 w-5" />
                  联合调试视图
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  看 diagnosis、session 主干和专项增强层是不是都已经连到一起。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!debugBundle?.session ? (
                  <div className="rounded-2xl border border-dashed border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                    当前还没有拿到完整的 analysis_session 关联，因此这里只能展示 diagnosis 层。完成 migration 并重新保存后，这里会显示主干 session 与专项增强层。
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <DebugMetric label="Diagnosis ID" value={record.id} />
                      <DebugMetric label="Session ID" value={debugBundle.session.id} />
                      <DebugMetric label="Input method" value={debugBundle.session.input_method} />
                      <DebugMetric label="Session status" value={debugBundle.session.status} />
                    </div>

                    <Card className="border-[var(--line-default)] bg-[var(--bg-primary)] shadow-none">
                      <CardHeader>
                        <CardTitle className="text-xl text-[var(--text-primary)]">主干 session</CardTitle>
                        <CardDescription>
                          {debugBundle.session.title} · {debugBundle.session.sport_type} · athlete={debugBundle.session.athlete_id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="overflow-x-auto rounded-xl bg-black/20 p-4 text-xs leading-6 text-[var(--text-secondary)]">
                          {JSON.stringify(
                            {
                              id: debugBundle.session.id,
                              athlete_id: debugBundle.session.athlete_id,
                              session_date: debugBundle.session.session_date,
                              input_method: debugBundle.session.input_method,
                              model_version: debugBundle.session.model_version,
                              summary_text: debugBundle.session.summary_text,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </CardContent>
                    </Card>

                    <div className="grid gap-4 xl:grid-cols-3">
                      {debugBundle.layers.map((layer) => (
                        <Card key={layer.key} className="border-[var(--line-default)] bg-[var(--bg-primary)] shadow-none">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-3">
                              <CardTitle className="text-base text-[var(--text-primary)]">{layer.label}</CardTitle>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">
                                {layer.available ? layer.source : "missing"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            <p className="text-sm text-[var(--text-secondary)]">{layer.summary}</p>
                            <pre className="max-h-72 overflow-auto rounded-xl bg-black/20 p-4 text-xs leading-6 text-[var(--text-secondary)]">
                              {JSON.stringify(layer.payload ?? null, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceShell>
  )
}

function SummaryBox({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-primary)] shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em]">{label}</CardDescription>
        <CardTitle className="text-3xl break-all">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-[var(--text-secondary)]">{note}</CardContent>
    </Card>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-list-row">
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function ContextBox({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-primary)] shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em]">{label}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-sm font-medium break-words text-[var(--text-primary)]">{value}</CardContent>
    </Card>
  )
}

function DebugMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-primary)] shadow-none">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em]">{label}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-sm font-medium break-all text-[var(--text-primary)]">{value}</CardContent>
    </Card>
  )
}