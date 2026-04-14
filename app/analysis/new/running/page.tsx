"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  buildRunningReportViewModel,
  buildRunningWeeklyPreview,
  calculateRunningScore,
  getOrCreateDefaultAthlete,
  getRunningSessions,
  mergeRunningSessions,
  saveRunningSession,
  type DatabaseRunningSession,
  type RunningGoalType,
  type RunningScoreReport,
  type RunningSessionInput,
  type RunningTrainingType,
} from "@/lib/scoring/running"
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
  const [report, setReport] = useState<RunningScoreReport | null>(null)
  const [input, setInput] = useState<RunningSessionInput | null>(null)
  const [sessionHistory, setSessionHistory] = useState<DatabaseRunningSession[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      const nextReport = calculateRunningScore(nextInput)
      setInput(nextInput)
      setReport(nextReport)
      setErrorMessage(null)
      setSaveMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "分析失败，请检查输入。")
    }
  }

  const handleSave = async () => {
    if (!report || !input) {
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

    const saveResult = await saveRunningSession(user.id, athleteResult.athleteId, input, report)
    setSaving(false)

    if (!saveResult.success) {
      setErrorMessage(saveResult.error || "保存失败。")
      return
    }

    const refreshedSessions = await getRunningSessions(user.id, { limit: 200 })
    if (refreshedSessions.success && refreshedSessions.sessions) {
      setSessionHistory(refreshedSessions.sessions)
    }

    setSaveMessage("训练记录已保存。")
  }

  const weeklyPreview = useMemo(() => {
    if (!input) {
      return undefined
    }

    const previewSessions = mergeRunningSessions(
      sessionHistory.map((session) => session.raw_input),
      input
    )

    return buildRunningWeeklyPreview(previewSessions, input.date).block
  }, [input, sessionHistory])

  const viewModel = useMemo(
    () => (input && report ? buildRunningReportViewModel(input, report, weeklyPreview) : null),
    [input, report, weeklyPreview]
  )

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Running Score v1.0</Badge>
            <span className="text-sm text-muted-foreground">先回答“有没有练对”，再看为什么。</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">跑步训练偏差复盘</h1>
        </div>

        {!report || !viewModel ? (
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
                  <p className="text-sm text-muted-foreground">有计划值时，系统更容易判断“有没有练对”。</p>
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
                生成训练偏差报告
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setReport(null)}>
                返回修改输入
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存训练记录"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/analysis/running/weekly")}>
                查看周训练块复盘
              </Button>
            </div>

            {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{viewModel.hero.trainingTypeLabel}</Badge>
                      {viewModel.hero.goalLabel ? <Badge variant="outline">{viewModel.hero.goalLabel}</Badge> : null}
                      <Badge variant={viewModel.hero.isOnTarget ? "default" : "secondary"}>{viewModel.hero.scoreRange}</Badge>
                    </div>
                    <h2 className="text-2xl font-semibold">{viewModel.hero.verdict}</h2>
                    <p className="text-sm text-muted-foreground">
                      {viewModel.hero.isOnTarget ? "这次训练整体落点是对的。" : "这次训练存在明显偏差，需要针对性修正。"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted p-4">
                    <div className="text-sm text-muted-foreground">综合得分</div>
                    <div className="mt-2 text-4xl font-semibold">{viewModel.hero.finalScore}</div>
                    <div className="mt-3 text-sm text-muted-foreground">报告可信度 {viewModel.hero.confidenceLabel}</div>
                    {viewModel.hero.confidenceReason ? (
                      <div className="mt-1 text-xs text-muted-foreground">{viewModel.hero.confidenceReason}</div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>四维评分</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {viewModel.dimensions.map((dimension) => (
                  <div key={dimension.key} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{dimension.label}</div>
                        <div className="text-sm text-muted-foreground">{dimension.verdict}</div>
                      </div>
                      <div className="text-2xl font-semibold">{dimension.score}</div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {dimension.evidence.slice(0, 2).map((item) => (
                        <div key={item}>{item}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>偏差诊断</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {viewModel.diagnosis.deviations.length > 0 ? (
                    viewModel.diagnosis.deviations.map((deviation) => (
                      <div key={deviation.code} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={deviation.severity === "major" ? "destructive" : "secondary"}>{deviation.severity}</Badge>
                          <span className="font-medium">{deviation.label}</span>
                        </div>
                        <p className="text-sm">{deviation.summary}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{deviation.action}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">没有识别到明显跑偏，这次训练执行比较干净。</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>这次最值得记住的两件事</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-emerald-500/5 p-4">
                    <div className="mb-1 font-medium">最值得肯定</div>
                    <div className="text-sm">{viewModel.diagnosis.strongestSignal.title}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{viewModel.diagnosis.strongestSignal.detail}</div>
                  </div>
                  <div className="rounded-lg border bg-amber-500/5 p-4">
                    <div className="mb-1 font-medium">最需要修正</div>
                    <div className="text-sm">{viewModel.diagnosis.biggestCorrection.title}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{viewModel.diagnosis.biggestCorrection.detail}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>下次训练建议</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {viewModel.suggestions.map((suggestion) => (
                  <div key={suggestion} className="rounded-lg border p-4 text-sm">
                    {suggestion}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>高级洞察</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {viewModel.advanced.length > 0 ? (
                  viewModel.advanced.map((insight) => (
                    <div key={insight.title} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline">实验性</Badge>
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

            {viewModel.weeklyEntry ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{viewModel.weeklyEntry.title}</div>
                    <div className="text-sm text-muted-foreground">{viewModel.weeklyEntry.summary}</div>
                  </div>
                  <Button variant="outline" onClick={() => router.push(viewModel.weeklyEntry!.href)}>
                    进入周复盘
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
