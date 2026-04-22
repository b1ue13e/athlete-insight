"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Radar, Target } from "lucide-react"
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
        return "text-[var(--accent)] bg-[var(--accent-dim)] border-[var(--line-accent)]"
      case "medium":
        return "text-[#ffc941] bg-[rgba(255,201,65,0.12)] border-[rgba(255,201,65,0.22)]"
      default:
        return "text-[#ff8b78] bg-[rgba(255,139,120,0.12)] border-[rgba(255,139,120,0.22)]"
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
      <section className="panel-elevated overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="data-pill text-xs uppercase tracking-[0.18em]">{SPORT_LABELS[report.meta.sport]}</span>
              <span className="data-pill text-xs uppercase tracking-[0.18em]">{report.scoreOverview.rangeLabel}</span>
              <span className={cn("inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]", confidenceTone)}>
                可信度 {report.confidence.label}
              </span>
            </div>

            <div className="space-y-3">
              <div className="eyebrow">Diagnosis summary</div>
              <h2 className="font-display text-[clamp(2rem,4vw,3.6rem)] leading-[0.95] tracking-[-0.04em] text-[var(--text-primary)]">
                {report.scoreOverview.verdict}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">{report.confidence.summary}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {report.inputSummary.context.map((item) => (
                <span key={item} className="data-pill text-xs">{item}</span>
              ))}
              {report.inputSummary.objective ? <span className="data-pill text-xs">目标：{report.inputSummary.objective}</span> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard label="Final score" value={String(report.scoreOverview.finalScore)} note="先看方向，再看分数。" accent />
            <StatCard label="Confidence" value={report.confidence.label} note={report.confidence.caveats[0] ?? "当前没有额外前提说明。"} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.scoreOverview.dimensions.map((dimension) => (
            <div key={dimension.key} className="dashboard-metric">
              <div className="eyebrow">{dimension.label}</div>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{dimension.score}</div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{dimension.verdict}</p>
              {dimension.evidence[0] ? <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{dimension.evidence[0]}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
          <div className="eyebrow">Signals</div>
          <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            <Radar className="h-5 w-5 text-[var(--accent)]" />
            为什么会得出这个判断
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">把结论拆成最关键的几条信号，而不是把全部信息堆在一起。</p>

          <div className="mt-5 space-y-3">
            {report.keyFindings.map((finding) => (
              <div
                key={finding.id}
                className={cn(
                  "rounded-[1.1rem] border px-4 py-4",
                  finding.tone === "positive"
                    ? "border-[rgba(214,255,114,0.22)] bg-[rgba(214,255,114,0.08)]"
                    : finding.tone === "warning"
                      ? "border-[rgba(255,201,65,0.22)] bg-[rgba(255,201,65,0.08)]"
                      : "border-[var(--line-default)] bg-[var(--bg-primary)]"
                )}
              >
                <div className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                  {finding.tone === "positive" ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[#ffc941]" />
                  )}
                  {finding.title}
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{finding.summary}</p>
                {finding.evidence.length > 0 ? (
                  <div className="mt-3 space-y-1 text-xs leading-5 text-[var(--text-tertiary)]">
                    {finding.evidence.map((item) => (
                      <div key={item}>• {item}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
          <div className="eyebrow">Risk</div>
          <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            <AlertTriangle className="h-5 w-5 text-[#ffc941]" />
            风险与阅读前提
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">把结构性风险和阅读前提拆开看，避免混在同一个判断里。</p>

          <div className="mt-5 space-y-3">
            {report.riskFlags.length > 0 ? (
              report.riskFlags.map((risk) => (
                <div key={risk.id} className="rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                      risk.severity === "high"
                        ? "bg-[rgba(255,139,120,0.16)] text-[#ff8b78]"
                        : risk.severity === "medium"
                          ? "bg-[rgba(255,201,65,0.16)] text-[#ffc941]"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                    )}>
                      {risk.severity}
                    </span>
                    <div className="text-base font-semibold text-[var(--text-primary)]">{risk.label}</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{risk.detail}</p>
                  {risk.evidence.length > 0 ? <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{risk.evidence.join("；")}</p> : null}
                </div>
              ))
            ) : (
              <div className="rounded-[1.1rem] border border-[rgba(214,255,114,0.22)] bg-[rgba(214,255,114,0.08)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                这次没有识别到明显的结构性风险，可以把注意力放在稳定复现和小幅递进上。
              </div>
            )}

            {report.confidence.caveats.length > 0 ? (
              <div className="rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">阅读前提</div>
                <div className="mt-3 space-y-1 text-xs leading-5 text-[var(--text-tertiary)]">
                  {report.confidence.caveats.map((item) => (
                    <div key={item}>• {item}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
        <div className="eyebrow">Action</div>
        <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          <Target className="h-5 w-5 text-[var(--accent)]" />
          下次训练最该怎么改
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">只保留最该带回下一次训练的内容，避免信息过载。</p>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {report.nextActions.map((action, index) => (
            <div key={action.id} className="rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line-default)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--accent)]">
                  {index + 1}
                </div>
                <div className="text-base font-semibold text-[var(--text-primary)]">{action.title}</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{action.detail}</p>
              {action.rationale ? <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{action.rationale}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
        <div className="eyebrow">Trend hooks</div>
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">建议长期追踪的钩子</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">这些指标更适合放进长期复盘，而不是只看单次波动。</p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.trendHooks.map((hook) => (
            <div key={hook.id} className="rounded-[1.1rem] border border-[var(--line-default)] bg-[var(--bg-primary)] px-4 py-4">
              <div className="eyebrow">{hook.label}</div>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{hook.value}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{hook.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[var(--line-default)] bg-[var(--bg-secondary)] p-5 lg:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-base font-semibold text-[var(--text-primary)]">这次判断对你有帮助吗？</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">把反馈留在这里，后续可以继续校准这套判断方式。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveFeedback("helpful")}
              className={cn(
                "action-secondary text-sm",
                feedback === "helpful" && "border-[var(--line-accent)] bg-[var(--accent-dim)] text-[var(--accent)]"
              )}
            >
              判断靠谱
            </button>
            <button
              type="button"
              onClick={() => saveFeedback("missed")}
              className={cn(
                "action-secondary text-sm",
                feedback === "missed" && "border-[rgba(255,201,65,0.22)] bg-[rgba(255,201,65,0.12)] text-[#ffc941]"
              )}
            >
              还不够准
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
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
    <div className="dashboard-metric">
      <div className="eyebrow">{label}</div>
      <div className={cn("mt-3 text-4xl font-semibold tracking-[-0.05em]", accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{note}</p>
    </div>
  )
}
