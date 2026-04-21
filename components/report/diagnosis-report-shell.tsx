"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Radar, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CanonicalAnalysisReport } from "@/lib/analysis/contracts"

const SPORT_LABELS = {
  running: "跑步诊断",
  gym: "健身诊断",
  volleyball: "排球诊断",
} as const

export function DiagnosisReportShell({
  report,
  feedbackStorageKey,
  initialFeedback,
  onFeedbackChange,
}: {
  report: CanonicalAnalysisReport
  feedbackStorageKey?: string
  initialFeedback?: "helpful" | "missed" | null
  onFeedbackChange?: (value: "helpful" | "missed") => void
}) {
  const [feedback, setFeedback] = useState<"helpful" | "missed" | null>(initialFeedback ?? null)

  useEffect(() => {
    setFeedback(initialFeedback ?? null)
  }, [initialFeedback])

  useEffect(() => {
    if (!feedbackStorageKey || typeof window === "undefined") {
      return
    }

    const stored = window.localStorage.getItem(`athlete_insight:feedback:${feedbackStorageKey}`)
    if (stored === "helpful" || stored === "missed") {
      setFeedback(stored)
    }
  }, [feedbackStorageKey])

  const confidenceTone = useMemo(() => {
    switch (report.confidence.band) {
      case "high":
        return "default"
      case "medium":
        return "secondary"
      default:
        return "destructive"
    }
  }, [report.confidence.band])

  const saveFeedback = (value: "helpful" | "missed") => {
    setFeedback(value)
    onFeedbackChange?.(value)
    if (!feedbackStorageKey || typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(`athlete_insight:feedback:${feedbackStorageKey}`, value)
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/15">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{SPORT_LABELS[report.meta.sport]}</Badge>
                <Badge variant="secondary">{report.scoreOverview.rangeLabel}</Badge>
                <Badge variant={confidenceTone}>可信度 {report.confidence.label}</Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{report.inputSummary.headline}</div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{report.scoreOverview.verdict}</h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{report.confidence.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {report.inputSummary.context.map((item) => (
                  <span key={item} className="rounded-full border px-3 py-1.5">
                    {item}
                  </span>
                ))}
                {report.inputSummary.objective ? (
                  <span className="rounded-full border px-3 py-1.5">目标：{report.inputSummary.objective}</span>
                ) : null}
              </div>
            </div>

            <div className="min-w-[170px] rounded-3xl border bg-muted/40 p-5 lg:text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Final score</div>
              <div className="mt-2 text-5xl font-semibold tracking-[-0.05em]">{report.scoreOverview.finalScore}</div>
              <div className="mt-2 text-sm text-muted-foreground">这次判断不是为了打分，而是为了找出下次最该改什么。</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {report.scoreOverview.dimensions.map((dimension) => (
              <div key={dimension.key} className="rounded-3xl border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{dimension.label}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{dimension.verdict}</div>
                  </div>
                  <div className="text-2xl font-semibold">{dimension.score}</div>
                </div>
                {dimension.evidence[0] ? (
                  <div className="mt-3 text-xs leading-5 text-muted-foreground">{dimension.evidence[0]}</div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Radar className="h-4 w-4" />
              为什么会得出这个判断
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.keyFindings.map((finding) => (
              <div
                key={finding.id}
                className={cn(
                  "rounded-3xl border p-4",
                  finding.tone === "positive"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : finding.tone === "warning"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {finding.tone === "positive" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  {finding.title}
                </div>
                <p className="mt-2 text-sm leading-6">{finding.summary}</p>
                {finding.evidence.length > 0 ? (
                  <div className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
                    {finding.evidence.map((item) => (
                      <div key={item}>• {item}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4" />
              风险与注意事项
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.riskFlags.length > 0 ? (
              report.riskFlags.map((risk) => (
                <div key={risk.id} className="rounded-3xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={risk.severity === "high" ? "destructive" : risk.severity === "medium" ? "secondary" : "outline"}>
                      {risk.severity}
                    </Badge>
                    <span className="text-sm font-medium">{risk.label}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{risk.detail}</p>
                  {risk.evidence.length > 0 ? (
                    <div className="mt-3 text-xs leading-5 text-muted-foreground">{risk.evidence.join("；")}</div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
                这次没有识别到明显的结构性风险，可以把注意力放在稳定复现和小幅递进上。
              </div>
            )}

            {report.confidence.caveats.length > 0 ? (
              <div className="rounded-3xl border bg-muted/30 p-4">
                <div className="text-sm font-medium">阅读这份结论时要带着这几个前提</div>
                <div className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                  {report.confidence.caveats.map((item) => (
                    <div key={item}>• {item}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Target className="h-4 w-4" />
            下次训练最该怎么改
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {report.nextActions.map((action, index) => (
            <div key={action.id} className="rounded-3xl border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="text-sm font-medium">{action.title}</div>
              </div>
              <p className="mt-3 text-sm leading-6">{action.detail}</p>
              {action.rationale ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{action.rationale}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">建议长期追踪的钩子</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.trendHooks.map((hook) => (
            <div key={hook.id} className="rounded-3xl border bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{hook.label}</div>
              <div className="mt-2 text-2xl font-semibold">{hook.value}</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{hook.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium">这次判断对你有帮助吗？</div>
            <div className="mt-1 text-sm text-muted-foreground">把反馈留在这里，后续我们可以持续校准判断方式。</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={feedback === "helpful" ? "default" : "outline"} onClick={() => saveFeedback("helpful")}>
              判断靠谱
            </Button>
            <Button variant={feedback === "missed" ? "secondary" : "outline"} onClick={() => saveFeedback("missed")}>
              还不够准
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
