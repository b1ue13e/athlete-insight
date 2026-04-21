"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DiagnosisReportShell } from "@/components/report/diagnosis-report-shell"
import {
  buildRunningReportViewModel,
  buildRunningWeeklyPreview,
  getOrCreateDefaultAthlete,
  getRunningSessions,
  mergeRunningSessions,
  saveRunningSession,
  type DatabaseRunningSession,
  type RunningGoalType,
  type RunningSessionInput,
  type RunningTrainingType,
} from "@/lib/scoring/running"
import { analyzeRunningActivity } from "@/lib/analysis/pipeline"
import { clearSavedCorrectionFocus, getSavedCorrectionFocus, saveCorrectionFocus, type SavedCorrectionFocus } from "@/lib/analysis/focus-memory"
import { getDiagnosisRecord, persistDiagnosisFeedback, saveCanonicalDiagnosisRecord } from "@/lib/analysis/store"
import { useAuth } from "@/contexts/auth-context"

type FormState = {
  trainingType: RunningTrainingType
  goalType: RunningGoalType | ""
  distanceKm: string
  durationMin: string
  avgPace: string
  avgHeartRate: string
  maxHeartRate: string
  rpe: string
  feeling: "easy" | "good" | "hard" | "exhausted"
  plannedDistance: string
  plannedDuration: string
  plannedPaceMin: string
  plannedPaceMax: string
  plannedHrMin: string
  plannedHrMax: string
}

const INITIAL_FORM: FormState = {
  trainingType: "easy",
  goalType: "",
  distanceKm: "8",
  durationMin: "48",
  avgPace: "6:00",
  avgHeartRate: "",
  maxHeartRate: "",
  rpe: "5",
  feeling: "good",
  plannedDistance: "",
  plannedDuration: "",
  plannedPaceMin: "",
  plannedPaceMax: "",
  plannedHrMin: "",
  plannedHrMax: "",
}

function paceTextToSeconds(value: string) {
  const [minutes, seconds = "0"] = value.split(":")
  const min = Number(minutes)
  const sec = Number(seconds)
  return Number.isFinite(min) && Number.isFinite(sec) ? min * 60 + sec : 0
}

function toOptionalNumber(value: string) {
  return value.trim() === "" ? undefined : Number(value)
}

export default function RunningAnalysisPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeRunningActivity> | null>(null)
  const [sessionHistory, setSessionHistory] = useState<DatabaseRunningSession[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savedFocus, setSavedFocus] = useState<SavedCorrectionFocus | null>(null)

  useEffect(() => {
    setSavedFocus(getSavedCorrectionFocus("running"))
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSessionHistory([])
      return
    }

    let cancelled = false

    const loadSessionHistory = async () => {
      const result = await getRunningSessions(user.id, { limit: 200 })
      if (cancelled || !result.success || !result.sessions) {
        return
      }

      setSessionHistory(result.sessions)
    }

    void loadSessionHistory()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user])

  const handleAnalyze = () => {
    const nextInput: RunningSessionInput = {
      id: `running-${Date.now()}`,
      date: new Date().toISOString(),
      trainingType: form.trainingType,
      goalType: form.goalType || undefined,
      durationMin: Number(form.durationMin),
      distanceKm: Number(form.distanceKm),
      avgPaceSec: paceTextToSeconds(form.avgPace),
      avgHeartRate: toOptionalNumber(form.avgHeartRate),
      maxHeartRate: toOptionalNumber(form.maxHeartRate),
      rpe: toOptionalNumber(form.rpe),
      feeling: form.feeling,
      plannedDistance: toOptionalNumber(form.plannedDistance),
      plannedDuration: toOptionalNumber(form.plannedDuration),
      plannedPaceRange:
        form.plannedPaceMin && form.plannedPaceMax
          ? {
              minSec: paceTextToSeconds(form.plannedPaceMin),
              maxSec: paceTextToSeconds(form.plannedPaceMax),
            }
          : undefined,
      plannedHeartRateRange:
        form.plannedHrMin && form.plannedHrMax
          ? {
              min: Number(form.plannedHrMin),
              max: Number(form.plannedHrMax),
            }
          : undefined,
      source: "manual",
    }

    try {
      setAnalysis(analyzeRunningActivity(nextInput))
      setErrorMessage(null)
      setSaveMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "分析失败，请检查输入。")
    }
  }

  const handleSave = async () => {
    if (!analysis) {
      return
    }

    if (!isAuthenticated || !user) {
      router.push("/auth/login")
      return
    }

    setSaving(true)
    setSaveMessage(null)
    setErrorMessage(null)

    const athleteResult = await getOrCreateDefaultAthlete(user.id, user.email)
    if (!athleteResult.success || !athleteResult.athleteId) {
      setSaving(false)
      setErrorMessage(athleteResult.error || "无法创建跑者档案。")
      return
    }

    const saveResult = await saveRunningSession(user.id, athleteResult.athleteId, analysis.input, analysis.report)
    setSaving(false)

    if (!saveResult.success) {
      setErrorMessage(saveResult.error || "保存失败。")
      return
    }

    const refreshedSessions = await getRunningSessions(user.id, { limit: 200 })
    if (refreshedSessions.success && refreshedSessions.sessions) {
      setSessionHistory(refreshedSessions.sessions)
    }

    await saveCanonicalDiagnosisRecord({
      id: saveResult.id ?? analysis.report.sessionId,
      analysisSessionId: saveResult.id,
      sport: "running",
      userId: user.id,
      athleteId: athleteResult.athleteId,
      athleteName: athleteResult.athleteName || user.displayName || user.email.split("@")[0] || "Runner",
      title: analysis.canonical.meta.title,
      createdAt: analysis.report.generatedAt,
      sessionDate: analysis.input.date,
      canonicalReport: analysis.canonical,
      rawReport: analysis.report,
    })

    setSaveMessage("训练记录已保存。")
  }

  const handleRememberFocus = () => {
    if (!analysis?.canonical.nextActions[0]) {
      return
    }

    saveCorrectionFocus("running", {
      title: analysis.canonical.nextActions[0].title,
      detail: analysis.canonical.nextActions[0].detail,
    })
    setSavedFocus(getSavedCorrectionFocus("running"))
    setSaveMessage("已记住这次最该修正的重点，下次进入跑步诊断会先提醒你。")
  }

  const handleClearFocus = () => {
    clearSavedCorrectionFocus("running")
    setSavedFocus(null)
  }

  const weeklyPreview = useMemo(() => {
    if (!analysis) {
      return undefined
    }

    const previewSessions = mergeRunningSessions(
      sessionHistory.map((session) => session.raw_input),
      analysis.input
    )

    return buildRunningWeeklyPreview(previewSessions, analysis.input.date).block
  }, [analysis, sessionHistory])

  const viewModel = useMemo(
    () => (analysis ? buildRunningReportViewModel(analysis.input, analysis.report, weeklyPreview) : null),
    [analysis, weeklyPreview]
  )

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Running Score v1.0</Badge>
            <span className="text-sm text-muted-foreground">先判断这次有没有练对，再决定下一次最该怎么改。</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">跑步训练诊断</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            跑步是当前产品主线：先给出这次训练是否落点正确，再把修正重点带回下一次训练，并放进周复盘里验证你有没有真的纠偏。
          </p>
        </div>

        {!analysis || !viewModel ? (
          <div className="space-y-6">
            {savedFocus ? (
              <Card className="border-primary/20">
                <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium">上次最该修正的重点</div>
                    <div className="mt-1 text-sm text-muted-foreground">{savedFocus.title}</div>
                    <p className="mt-2 text-sm leading-6">{savedFocus.detail}</p>
                  </div>
                  <Button variant="ghost" onClick={handleClearFocus}>
                    清除提醒
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>训练输入</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>训练类型</Label>
                    <Select value={form.trainingType} onValueChange={(value) => setForm((current) => ({ ...current, trainingType: value as RunningTrainingType }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">轻松跑</SelectItem>
                        <SelectItem value="recovery">恢复跑</SelectItem>
                        <SelectItem value="tempo">节奏跑</SelectItem>
                        <SelectItem value="interval">间歇跑</SelectItem>
                        <SelectItem value="long">长距离</SelectItem>
                        <SelectItem value="race">比赛 / 测试</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>目标类型</Label>
                    <Select value={form.goalType || "none"} onValueChange={(value) => setForm((current) => ({ ...current, goalType: value === "none" ? "" : (value as RunningGoalType) }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="可不填" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="5k">5K</SelectItem>
                        <SelectItem value="10k">10K</SelectItem>
                        <SelectItem value="half">半马</SelectItem>
                        <SelectItem value="marathon">全马</SelectItem>
                        <SelectItem value="fatloss">减脂</SelectItem>
                        <SelectItem value="test">测试</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>距离 (km)</Label>
                    <Input value={form.distanceKm} onChange={(event) => setForm((current) => ({ ...current, distanceKm: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>时长 (min)</Label>
                    <Input value={form.durationMin} onChange={(event) => setForm((current) => ({ ...current, durationMin: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>平均配速</Label>
                    <Input value={form.avgPace} onChange={(event) => setForm((current) => ({ ...current, avgPace: event.target.value }))} placeholder="5:40" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>平均心率</Label>
                    <Input value={form.avgHeartRate} onChange={(event) => setForm((current) => ({ ...current, avgHeartRate: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>最大心率</Label>
                    <Input value={form.maxHeartRate} onChange={(event) => setForm((current) => ({ ...current, maxHeartRate: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>RPE</Label>
                    <Input value={form.rpe} onChange={(event) => setForm((current) => ({ ...current, rpe: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>体感</Label>
                    <Select value={form.feeling} onValueChange={(value) => setForm((current) => ({ ...current, feeling: value as FormState["feeling"] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">轻松</SelectItem>
                        <SelectItem value="good">正常</SelectItem>
                        <SelectItem value="hard">吃力</SelectItem>
                        <SelectItem value="exhausted">透支</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed p-4">
                  <div className="mb-4">
                    <h2 className="font-medium">可选计划值</h2>
                    <p className="text-sm text-muted-foreground">有计划值时，系统更容易判断“这次是没练，还是练偏了”。</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>计划距离 (km)</Label>
                      <Input value={form.plannedDistance} onChange={(event) => setForm((current) => ({ ...current, plannedDistance: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>计划时长 (min)</Label>
                      <Input value={form.plannedDuration} onChange={(event) => setForm((current) => ({ ...current, plannedDuration: event.target.value }))} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>计划配速下限</Label>
                        <Input value={form.plannedPaceMin} onChange={(event) => setForm((current) => ({ ...current, plannedPaceMin: event.target.value }))} placeholder="5:20" />
                      </div>
                      <div className="space-y-2">
                        <Label>计划配速上限</Label>
                        <Input value={form.plannedPaceMax} onChange={(event) => setForm((current) => ({ ...current, plannedPaceMax: event.target.value }))} placeholder="5:40" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>计划心率下限</Label>
                        <Input value={form.plannedHrMin} onChange={(event) => setForm((current) => ({ ...current, plannedHrMin: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>计划心率上限</Label>
                        <Input value={form.plannedHrMax} onChange={(event) => setForm((current) => ({ ...current, plannedHrMax: event.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

                <Button className="w-full" onClick={handleAnalyze}>
                  生成训练诊断
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setAnalysis(null)}>
                返回修改输入
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存训练记录"}
              </Button>
              <Button variant="outline" onClick={handleRememberFocus}>
                记住本次修正重点
              </Button>
              <Button variant="outline" onClick={() => router.push("/analysis/running/weekly")}>
                查看周复盘
              </Button>
            </div>

            {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

            <DiagnosisReportShell
              report={analysis.canonical}
              initialFeedback={getDiagnosisRecord(analysis.report.sessionId)?.feedback ?? null}
              onFeedbackChange={(value) => void persistDiagnosisFeedback(analysis.report.sessionId, value, user?.id)}
            />

            <Card>
              <CardHeader>
                <CardTitle>跑步专项拆解</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-medium">本次最值得记住的两件事</div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="text-sm font-medium">最值得肯定</div>
                      <div className="mt-2 text-sm">{viewModel.diagnosis.strongestSignal.title}</div>
                      <div className="mt-2 text-sm text-muted-foreground">{viewModel.diagnosis.strongestSignal.detail}</div>
                    </div>
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="text-sm font-medium">最该修正</div>
                      <div className="mt-2 text-sm">{viewModel.diagnosis.biggestCorrection.title}</div>
                      <div className="mt-2 text-sm text-muted-foreground">{viewModel.diagnosis.biggestCorrection.detail}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-medium">周复盘入口</div>
                  {viewModel.weeklyEntry ? (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-muted-foreground">{viewModel.weeklyEntry.summary}</p>
                      <Button variant="outline" onClick={() => router.push(viewModel.weeklyEntry!.href)}>
                        进入周复盘
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">先保存更多单次训练，这里会自动长出周结构复盘。</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>高级洞察</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {viewModel.advanced.length > 0 ? (
                  viewModel.advanced.map((insight) => (
                    <div key={insight.title} className="rounded-2xl border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline">实验层</Badge>
                        <Badge variant="secondary">{insight.evidenceLevel}</Badge>
                        <span className="font-medium">{insight.title}</span>
                      </div>
                      <p className="text-sm">{insight.summary}</p>
                      {insight.lines.length > 0 ? (
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {insight.lines.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">当前输入没有足够高级数据，因此这部分会自动隐藏，不影响主结论。</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
