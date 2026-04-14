"use client"

import { useMemo } from "react"
import { DivergenceChart } from "@/components/telemetry/divergence-chart"
import { generateRunningCoachInsight } from "@/lib/ai-running-analyst"
import { generateEliteRunningReport, type RunningDataPoint, type RunningSession } from "@/lib/running-advanced-metrics"

function buildTelemetrySession(): RunningSession {
  const dataPoints: RunningDataPoint[] = []
  const totalPoints = 160

  for (let index = 0; index < totalPoints; index += 1) {
    const progress = index / totalPoints
    dataPoints.push({
      timestamp: index * 20 * 1000,
      distance: progress * 18 * 1000,
      pace: 330 + (progress > 0.55 ? (progress - 0.55) * 85 : 0),
      heartRate: Math.round(146 + progress * 18 + (progress > 0.55 ? (progress - 0.55) * 18 : 0)),
      cadence: 180 - (progress > 0.7 ? Math.round((progress - 0.7) * 18) : 0),
      groundContactTime: 212 + (progress > 0.7 ? Math.round((progress - 0.7) * 50) : 0),
      strideLength: 1.12,
    })
  }

  return {
    id: "telemetry-running",
    date: new Date().toISOString(),
    totalDistance: 18 * 1000,
    totalTime: 88 * 60,
    avgPace: 340,
    avgHeartRate: 159,
    maxHeartRate: 178,
    avgCadence: 177,
    avgGroundContactTime: 223,
    elevationGain: 48,
    dataPoints,
    trainingGoal: "long",
    perceivedExertion: 7,
  }
}

export default function RunningTelemetryPage() {
  const session = useMemo(() => buildTelemetrySession(), [])
  const report = useMemo(() => generateEliteRunningReport(session), [session])
  const insight = useMemo(() => generateRunningCoachInsight(report.aiPayload), [report])

  const chartData = useMemo(
    () =>
      session.dataPoints.map((point) => ({
        distance: point.distance / 1000,
        pace: point.pace,
        heartRate: point.heartRate,
        paceDisplay: `${Math.floor(point.pace / 60)}:${String(Math.round(point.pace % 60)).padStart(2, "0")}`,
      })),
    [session]
  )

  const divergenceStart = Math.max(1, Math.floor(session.dataPoints.length * 0.58))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Telemetry</p>
              <h1 className="mt-2 text-3xl font-semibold">Advanced insights, safely demoted</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Telemetry remains useful for explanation and experimentation, but the main running score is still decided by
                execution rules.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
                <div className="text-xs text-slate-400">Decoupling</div>
                <div className="text-2xl font-semibold">{report.layer1_aerobic.decouplingRate}%</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
                <div className="text-xs text-slate-400">Threshold HR</div>
                <div className="text-2xl font-semibold">{report.layer2_threshold.thresholdHR}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3">
                <div className="text-xs text-slate-400">Mechanics</div>
                <div className="text-2xl font-semibold">{report.layer3_biomechanics.decayDetected ? "late fade" : "stable"}</div>
              </div>
            </div>
          </div>
        </section>

        <DivergenceChart data={chartData} decouplingStartIndex={divergenceStart} />

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">What telemetry confirms</h2>
            <p className="mt-3 text-sm text-slate-300">{report.layer1_aerobic.oneLiner}</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">What it does not decide</h2>
            <p className="mt-3 text-sm text-slate-300">
              Threshold and biomechanics are shown only as advanced support signals. They do not override the main running score.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Actionable takeaway</h2>
            <p className="mt-3 text-sm text-slate-300">{insight.rootCause}</p>
          </article>
        </section>
      </div>
    </div>
  )
}
