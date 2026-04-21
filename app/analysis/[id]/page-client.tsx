"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Download, Layers3, Trash2 } from "lucide-react"
import { DiagnosisReportShell } from "@/components/report/diagnosis-report-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      return { href: "/analysis/new", label: "再做一次专项诊断" }
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
    return <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)]">加载中...</div>
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-10 text-[var(--text-primary)]">
        <div className="mx-auto max-w-2xl text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <h1 className="text-2xl font-semibold">这份诊断不存在</h1>
          <p className="mt-2 text-[var(--text-secondary)]">它可能已经被删除，或者还没有完成保存。</p>
          <Link href="/history" className="action-primary mt-6 inline-flex text-sm">
            返回诊断历史
          </Link>
        </div>
      </div>
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
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-6 text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Link href="/history" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-sharp hover:text-[var(--text-primary)]">
              <ArrowLeft className="h-4 w-4" />
              返回诊断历史
            </Link>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{record.athleteName}</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{record.title}</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {new Date(record.createdAt).toLocaleString("zh-CN")} · {record.canonicalReport.meta.sport}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportReport}>
              <Download className="mr-2 h-4 w-4" />
              导出 JSON
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </div>
        </header>

        <DiagnosisReportShell
          report={record.canonicalReport}
          initialFeedback={record.feedback ?? null}
          onFeedbackChange={(value) => {
            void persistDiagnosisFeedback(record.id, value, user?.id)
            setRecord((current) => (current ? { ...current, feedback: value } : current))
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader>
              <CardTitle>诊断元信息</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Source</div>
                <div className="mt-2 text-lg font-semibold">{record.source === "pipeline" ? "Unified pipeline" : "Legacy migration"}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Version</div>
                <div className="mt-2 text-lg font-semibold">{record.canonicalReport.meta.version}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Session date</div>
                <div className="mt-2 text-lg font-semibold">{record.sessionDate}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Current feedback</div>
                <div className="mt-2 text-lg font-semibold">{record.feedback === "helpful" ? "判断靠谱" : record.feedback === "missed" ? "还不够准" : "未反馈"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>继续下一次动作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                真正的价值不在于看完一份报告，而在于带着修正重点回到下一次训练里，再回来验证你有没有真的改对。
              </p>
              <Link href={continuation.href} className="action-primary inline-flex w-full justify-center text-sm">
                {continuation.label}
              </Link>
              {record.sport === "running" ? (
                <Link href="/analysis/running/weekly" className="action-secondary inline-flex w-full justify-center text-sm">
                  查看跑步周复盘
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-4 w-4" />
              联合调试视图
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!debugBundle?.session ? (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-[var(--text-secondary)]">
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

                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-medium">主干 session</div>
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">
                    {debugBundle.session.title} · {debugBundle.session.sport_type} · athlete={debugBundle.session.athlete_id}
                  </div>
                  <pre className="mt-4 overflow-x-auto rounded-xl bg-black/20 p-4 text-xs leading-6 text-[var(--text-secondary)]">
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
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  {debugBundle.layers.map((layer) => (
                    <div key={layer.key} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{layer.label}</div>
                        <div className="data-pill text-[10px] uppercase tracking-[0.18em]">
                          {layer.available ? layer.source : "missing"}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{layer.summary}</p>
                      <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-black/20 p-4 text-xs leading-6 text-[var(--text-secondary)]">
                        {JSON.stringify(layer.payload ?? null, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DebugMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-2 text-sm font-medium break-all">{value}</div>
    </div>
  )
}
