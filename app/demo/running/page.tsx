"use client"

import { useMemo } from "react"
import {
  generateEliteRunningReport,
  generateRunningAIPrompt,
  type RunningDataPoint,
  type RunningSession,
} from "@/lib/running-advanced-metrics"
import { formatRunningCoachReport, generateRunningCoachInsight } from "@/lib/ai-running-analyst"

function buildMockSession(): RunningSession {
  const dataPoints: RunningDataPoint[] = []
  const totalPoints = 180

  for (let index = 0; index < totalPoints; index += 1) {
    const progress = index / totalPoints
    const pace = 305 + (progress > 0.55 ? (progress - 0.55) * 70 : 0)
    const heartRate = Math.round(154 + progress * 14 + (progress > 0.55 ? (progress - 0.55) * 20 : 0))
    const cadence = 182 - (progress > 0.7 ? Math.round((progress - 0.7) * 16) : 0)
    const groundContactTime = 215 + (progress > 0.7 ? Math.round((progress - 0.7) * 45) : 0)

    dataPoints.push({
      timestamp: index * 30 * 1000,
      distance: progress * 21.1 * 1000,
      pace,
      heartRate,
      cadence,
      groundContactTime,
      strideLength: 1.15,
    })
  }

  return {
    id: "running-demo",
    date: new Date().toISOString(),
    totalDistance: 21.1 * 1000,
    totalTime: 108 * 60,
    avgPace: 312,
    avgHeartRate: 167,
    maxHeartRate: 184,
    avgCadence: 178,
    avgGroundContactTime: 226,
    elevationGain: 65,
    dataPoints,
    trainingGoal: "race",
    perceivedExertion: 8,
  }
}

export default function RunningDemoPage() {
  const session = useMemo(() => buildMockSession(), [])
  const report = useMemo(() => generateEliteRunningReport(session), [session])
  const insight = useMemo(() => generateRunningCoachInsight(report.aiPayload), [report])
  const prompt = useMemo(() => generateRunningAIPrompt(report.aiPayload), [report])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Running Demo</p>
              <h1 className="mt-2 text-3xl font-semibold">Training deviation demo</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{report.summary.oneLiner}</p>
            </div>
            <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 px-4 py-3">
              <div className="text-sm text-lime-200">Final score</div>
              <div className="text-4xl font-bold text-lime-300">{report.summary.overallScore}</div>
              <div className="text-sm text-lime-100">{report.summary.verdict}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Aerobic drift</p>
            <div className="mt-2 text-3xl font-semibold">{report.layer1_aerobic.decouplingRate}%</div>
            <p className="mt-2 text-sm text-slate-300">{report.layer1_aerobic.oneLiner}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Threshold estimate</p>
            <div className="mt-2 text-3xl font-semibold">
              {Math.floor(report.layer2_threshold.thresholdPace / 60)}:
              {String(Math.round(report.layer2_threshold.thresholdPace % 60)).padStart(2, "0")}
            </div>
            <p className="mt-2 text-sm text-slate-300">{report.layer2_threshold.oneLiner}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Biomechanics</p>
            <div className="mt-2 text-3xl font-semibold">
              {report.layer3_biomechanics.decayDetected ? "decayed" : "stable"}
            </div>
            <p className="mt-2 text-sm text-slate-300">{report.layer3_biomechanics.oneLiner}</p>
          </article>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Coach summary</h2>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{formatRunningCoachReport(insight)}</pre>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">LLM prompt example</h2>
            <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap text-sm text-slate-300">{prompt}</pre>
          </article>
        </section>
      </div>
    </div>
  )
}
