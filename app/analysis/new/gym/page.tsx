"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DiagnosisReportShell } from "@/components/report/diagnosis-report-shell"
import { useAuth } from "@/contexts/auth-context"
import { AthleteProfile, createAthlete, listAthletes, resolveCurrentAthlete, setCurrentAthlete } from "@/lib/athletes"
import { saveGymAnalysisSession } from "@/lib/analysis/session-store"
import {
  analyzeGymWeeklyBlock,
  type CompoundOrIsolation,
  type Equipment,
  type ExerciseSetEntry,
  type GymGoalType,
  type GymSessionInput,
  type GymSessionTag,
  type GymSplitType,
  type MovementPattern,
} from "@/lib/scoring/gym"
import { analyzeGymActivity } from "@/lib/analysis/pipeline"
import { clearSavedCorrectionFocus, getSavedCorrectionFocus, saveCorrectionFocus, type SavedCorrectionFocus } from "@/lib/analysis/focus-memory"
import { getDiagnosisRecord, persistDiagnosisFeedback, saveCanonicalDiagnosisRecord } from "@/lib/analysis/store"

type ExerciseDraft = {
  exerciseName: string
  movementPattern: MovementPattern
  primaryMuscles: string
  equipment: Equipment
  compoundOrIsolation: CompoundOrIsolation
  sets: string
  repsPerSet: string
  loadPerSet: string
  rpePerSet: string
  rirPerSet: string
}

const GOALS: Record<GymGoalType, string> = {
  hypertrophy: "增肌",
  strength: "力量",
  fat_loss: "减脂",
  recomposition: "重组",
  physique: "塑形",
  beginner_adaptation: "新手适应",
}

const SPLITS: Record<GymSplitType, string> = {
  full_body: "全身",
  upper_lower: "上下肢",
  ppl: "PPL",
  bro_split: "部位分化",
  strength_split: "力量分化",
  custom: "自定义",
}

const TAGS: Record<GymSessionTag, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  full_body: "Full Body",
  conditioning: "Conditioning",
  accessory: "Accessory",
  recovery: "Recovery",
}

const PATTERNS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  horizontal_push: "Horizontal Push",
  vertical_push: "Vertical Push",
  horizontal_pull: "Horizontal Pull",
  vertical_pull: "Vertical Pull",
  lunge: "Lunge",
  carry: "Carry",
  isolation: "Isolation",
  core: "Core",
  conditioning: "Conditioning",
}

const EQUIPMENT: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  band: "Band",
  sled: "Sled",
  cardio_machine: "Cardio Machine",
  other: "Other",
}

const EMPTY: ExerciseDraft = {
  exerciseName: "",
  movementPattern: "horizontal_push",
  primaryMuscles: "chest,front_delts,triceps",
  equipment: "barbell",
  compoundOrIsolation: "compound",
  sets: "3",
  repsPerSet: "8,8,8",
  loadPerSet: "",
  rpePerSet: "",
  rirPerSet: "",
}

function parseList(value: string) {
  const values = value.split(",").map((item) => item.trim()).filter(Boolean).map(Number).filter(Number.isFinite)
  return values.length > 0 ? values : undefined
}

function buildExercise(draft: ExerciseDraft): ExerciseSetEntry {
  return {
    exerciseName: draft.exerciseName.trim(),
    movementPattern: draft.movementPattern,
    primaryMuscles: draft.primaryMuscles.split(",").map((item) => item.trim()).filter(Boolean) as ExerciseSetEntry["primaryMuscles"],
    equipment: draft.equipment,
    compoundOrIsolation: draft.compoundOrIsolation,
    sets: Number(draft.sets),
    repsPerSet: parseList(draft.repsPerSet) ?? [8],
    loadPerSet: parseList(draft.loadPerSet),
    rpePerSet: parseList(draft.rpePerSet),
    rirPerSet: parseList(draft.rirPerSet),
  }
}

export default function GymAnalysisPage() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null)
  const [isCreatingAthlete, setIsCreatingAthlete] = useState(false)
  const [newAthleteName, setNewAthleteName] = useState("")
  const [newAthleteTeam, setNewAthleteTeam] = useState("")
  const [goalType, setGoalType] = useState<GymGoalType>("hypertrophy")
  const [splitType, setSplitType] = useState<GymSplitType>("ppl")
  const [sessionTag, setSessionTag] = useState<GymSessionTag>("push")
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [durationMin, setDurationMin] = useState("65")
  const [perceivedFatigue, setPerceivedFatigue] = useState("")
  const [soreness, setSoreness] = useState("")
  const [sleepQuality, setSleepQuality] = useState("")
  const [exercises, setExercises] = useState<ExerciseDraft[]>([{ ...EMPTY }])
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeGymActivity> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [savedFocus, setSavedFocus] = useState<SavedCorrectionFocus | null>(null)

  useEffect(() => {
    setSavedFocus(getSavedCorrectionFocus("gym"))
  }, [])

  useEffect(() => {
    let cancelled = false

    void listAthletes(user?.id).then((nextAthletes) => {
      if (!cancelled) {
        setAthletes(nextAthletes)
      }
    })

    void resolveCurrentAthlete(user?.id).then((current) => {
      if (!cancelled && current) {
        setSelectedAthlete(current)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const buildInput = useCallback((): GymSessionInput => {
    const parsed = exercises.map(buildExercise).filter((exercise) => exercise.exerciseName.length > 0)
    if (parsed.length === 0) {
      throw new Error("至少填写一个动作，系统才能判断这次训练有没有真正练到点上。")
    }

    return {
      sport: "gym",
      goalType,
      splitType,
      sessionTag,
      sessionDate,
      durationMin: Number(durationMin),
      exercises: parsed,
      perceivedFatigue: perceivedFatigue ? Number(perceivedFatigue) : undefined,
      soreness: soreness ? Number(soreness) : undefined,
      sleepQuality: sleepQuality ? Number(sleepQuality) : undefined,
      source: "manual",
    }
  }, [durationMin, exercises, goalType, perceivedFatigue, sessionDate, sessionTag, sleepQuality, soreness, splitType])

  const weeklyPreview = useMemo(() => {
    if (!analysis) return null
    try {
      return analyzeGymWeeklyBlock([analysis.input])
    } catch {
      return null
    }
  }, [analysis])

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((current) => current.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise)))
  }

  function handleAnalyze() {
    if (!selectedAthlete) {
      setErrorMessage("请先选择一个 athlete，再生成健身诊断。")
      return
    }

    try {
      setAnalysis(analyzeGymActivity(buildInput()))
      setErrorMessage(null)
      setSaveMessage(null)
    } catch (error) {
      setAnalysis(null)
      setErrorMessage(error instanceof Error ? error.message : "生成 Gym 报告失败，请检查输入。")
    }
  }

  function handleRememberFocus() {
    if (!analysis?.canonical.nextActions[0]) {
      return
    }

    saveCorrectionFocus("gym", {
      title: analysis.canonical.nextActions[0].title,
      detail: analysis.canonical.nextActions[0].detail,
    })
    setSavedFocus(getSavedCorrectionFocus("gym"))
    setSaveMessage("已记住这次最该修正的重点。")
  }

  async function handleSaveDiagnosis() {
    if (!analysis || !selectedAthlete) {
      return
    }

    const sessionResult = await saveGymAnalysisSession({
      userId: user?.id,
      athlete: selectedAthlete,
      input: analysis.input,
      report: analysis.report,
    })

    if (!sessionResult.success) {
      setErrorMessage(sessionResult.error ?? "保存 gym session 失败。")
      return
    }

    await saveCanonicalDiagnosisRecord({
      id: sessionResult.id ?? analysis.canonical.meta.sessionId,
      analysisSessionId: sessionResult.id,
      sport: "gym",
      userId: user?.id,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.name,
      title: analysis.canonical.meta.title,
      createdAt: analysis.canonical.meta.generatedAt,
      sessionDate: analysis.canonical.meta.sessionDate,
      canonicalReport: analysis.canonical,
      rawReport: analysis.report,
    })
    setSaveMessage("这次健身诊断已保存到历史。")
  }


  async function handleCreateAthlete() {
    if (!newAthleteName.trim()) {
      return
    }

    const athlete = await createAthlete(
      {
        name: newAthleteName.trim(),
        position: "Gym",
        team: newAthleteTeam.trim() || undefined,
        primarySport: "gym",
      },
      user?.id
    )

    setAthletes((current) => [athlete, ...current.filter((item) => item.id !== athlete.id)])
    setSelectedAthlete(athlete)
    setCurrentAthlete(athlete.id)
    setNewAthleteName("")
    setNewAthleteTeam("")
    setIsCreatingAthlete(false)
  }

  const report = analysis?.report as ReturnType<typeof analyzeGymActivity>["report"]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%)] py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline">Gym Score v1.0</Badge>
            <Badge variant="secondary">结构诊断优先</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">健身训练诊断</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            健身模块不是动作记录器，而是判断这次训练有没有真正服务目标：刺激够不够、结构偏不偏、疲劳会不会压垮下次训练。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">训练输入</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">绑定 athlete</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">健身诊断也要落到真实 athlete 实体上，后续历史、反馈和趋势才能合在一起看。</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div className="space-y-2">
                      <Label>选择 athlete</Label>
                      <Select
                        value={selectedAthlete?.id ?? "none"}
                        onValueChange={(value) => {
                          if (value === "none") {
                            setSelectedAthlete(null)
                            return
                          }
                          const athlete = athletes.find((item) => item.id === value) ?? null
                          setSelectedAthlete(athlete)
                          if (athlete) {
                            setCurrentAthlete(athlete.id)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="先选一个 athlete" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">暂不选择</SelectItem>
                          {athletes.map((athlete) => (
                            <SelectItem key={athlete.id} value={athlete.id}>
                              {athlete.name}
                              {athlete.team ? ` · ${athlete.team}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="button" variant="outline" onClick={() => setIsCreatingAthlete((current) => !current)}>
                      {isCreatingAthlete ? "取消新建" : "新建 athlete"}
                    </Button>
                  </div>

                  {selectedAthlete ? (
                    <div className="rounded-2xl border bg-background/70 p-3 text-sm">
                      当前绑定：<span className="font-medium">{selectedAthlete.name}</span>
                      {selectedAthlete.team ? <span className="text-muted-foreground"> · {selectedAthlete.team}</span> : null}
                    </div>
                  ) : null}

                  {isCreatingAthlete ? (
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                      <div className="space-y-2">
                        <Label>姓名</Label>
                        <Input value={newAthleteName} onChange={(event) => setNewAthleteName(event.target.value)} placeholder="例如：Alice" />
                      </div>
                      <div className="space-y-2">
                        <Label>队伍 / 组别</Label>
                        <Input value={newAthleteTeam} onChange={(event) => setNewAthleteTeam(event.target.value)} placeholder="可不填" />
                      </div>
                      <Button type="button" onClick={handleCreateAthlete} disabled={!newAthleteName.trim()}>
                        创建并绑定
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label>目标模板</Label>
                  <Select value={goalType} onValueChange={(value) => setGoalType(value as GymGoalType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(GOALS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>分化模板</Label>
                  <Select value={splitType} onValueChange={(value) => setSplitType(value as GymSplitType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(SPLITS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>今日标签</Label>
                  <Select value={sessionTag} onValueChange={(value) => setSessionTag(value as GymSessionTag)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(TAGS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2"><Label>日期</Label><Input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} /></div>
                <div className="space-y-2"><Label>时长</Label><Input type="number" value={durationMin} onChange={(event) => setDurationMin(event.target.value)} /></div>
                <div className="space-y-2"><Label>主观疲劳</Label><Input value={perceivedFatigue} onChange={(event) => setPerceivedFatigue(event.target.value)} placeholder="可选，1-10" /></div>
                <div className="space-y-2"><Label>酸痛 / 睡眠</Label><div className="grid grid-cols-2 gap-2"><Input value={soreness} onChange={(event) => setSoreness(event.target.value)} placeholder="酸痛" /><Input value={sleepQuality} onChange={(event) => setSleepQuality(event.target.value)} placeholder="睡眠" /></div></div>
              </div>

              {savedFocus ? (
                <Card className="border-primary/20">
                  <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-medium">上次最该修正的重点</div>
                      <div className="mt-1 text-sm text-muted-foreground">{savedFocus.title}</div>
                      <p className="mt-2 text-sm leading-6">{savedFocus.detail}</p>
                    </div>
                    <Button variant="ghost" onClick={() => { clearSavedCorrectionFocus("gym"); setSavedFocus(null) }}>
                      清除提醒
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>动作列表</Label>
                    <p className="mt-1 text-xs text-muted-foreground">每组数据支持单值或逗号序列，例如 `8,8,8`。</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setExercises((current) => [...current, { ...EMPTY }])}>
                    添加动作
                  </Button>
                </div>

                {exercises.map((exercise, index) => (
                  <div key={`exercise-${index}`} className="rounded-2xl border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-sm font-medium">动作 {index + 1}</div>
                      {exercises.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setExercises((current) => current.filter((_, i) => i !== index))}>
                          删除
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>动作名称</Label><Input value={exercise.exerciseName} onChange={(event) => updateExercise(index, { exerciseName: event.target.value })} /></div>
                      <div className="space-y-2"><Label>目标肌群</Label><Input value={exercise.primaryMuscles} onChange={(event) => updateExercise(index, { primaryMuscles: event.target.value })} /></div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>动作模式</Label>
                        <Select value={exercise.movementPattern} onValueChange={(value) => updateExercise(index, { movementPattern: value as MovementPattern })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(PATTERNS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>器械</Label>
                        <Select value={exercise.equipment} onValueChange={(value) => updateExercise(index, { equipment: value as Equipment })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(EQUIPMENT).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>动作类型</Label>
                        <Select value={exercise.compoundOrIsolation} onValueChange={(value) => updateExercise(index, { compoundOrIsolation: value as CompoundOrIsolation })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compound">复合动作</SelectItem>
                            <SelectItem value="isolation">孤立动作</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>组数</Label><Input value={exercise.sets} onChange={(event) => updateExercise(index, { sets: event.target.value })} /></div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2"><Label>次数</Label><Input value={exercise.repsPerSet} onChange={(event) => updateExercise(index, { repsPerSet: event.target.value })} /></div>
                      <div className="space-y-2"><Label>重量</Label><Input value={exercise.loadPerSet} onChange={(event) => updateExercise(index, { loadPerSet: event.target.value })} /></div>
                      <div className="space-y-2"><Label>RPE</Label><Input value={exercise.rpePerSet} onChange={(event) => updateExercise(index, { rpePerSet: event.target.value })} /></div>
                      <div className="space-y-2"><Label>RIR</Label><Input value={exercise.rirPerSet} onChange={(event) => updateExercise(index, { rirPerSet: event.target.value })} /></div>
                    </div>
                  </div>
                ))}
              </div>

              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>无法生成报告</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <Button className="w-full" onClick={handleAnalyze}>
                生成 Gym 诊断
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!analysis ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">报告预览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl border p-4">你会先看到一句判断，再看到证据链、主要风险和下一次最该改什么。</div>
                  <div className="rounded-2xl border p-4">健身诊断不追求堆很多术语，而是把“有没有练到点上”说清楚。</div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setAnalysis(null)}>
                    返回修改输入
                  </Button>
                  <Button variant="outline" onClick={handleSaveDiagnosis}>
                    保存到历史
                  </Button>
                  <Button variant="outline" onClick={handleRememberFocus}>
                    记住本次修正重点
                  </Button>
                </div>

                {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}

                <DiagnosisReportShell
                  report={analysis.canonical}
                  initialFeedback={getDiagnosisRecord(analysis.canonical.meta.sessionId)?.feedback ?? null}
                  onFeedbackChange={(value) => void persistDiagnosisFeedback(analysis.canonical.meta.sessionId, value, user?.id)}
                />

                {weeklyPreview ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">周训练块预览</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-muted/40 p-4">
                          <div className="text-xs text-muted-foreground">训练次数</div>
                          <div className="mt-1 text-2xl font-semibold">{weeklyPreview.totalSessions}</div>
                        </div>
                        <div className="rounded-2xl bg-muted/40 p-4">
                          <div className="text-xs text-muted-foreground">总时长</div>
                          <div className="mt-1 text-2xl font-semibold">{weeklyPreview.totalDuration} min</div>
                        </div>
                        <div className="col-span-2 rounded-2xl border p-4 sm:col-span-1">
                          <div className="text-xs text-muted-foreground">恢复压力</div>
                          <div className="mt-1 text-2xl font-semibold">{weeklyPreview.estimatedRecoveryPressure}</div>
                        </div>
                      </div>
                      <div className="rounded-2xl border p-4 text-sm leading-6 text-muted-foreground">{weeklyPreview.weeklyStructureAssessment}</div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="border-dashed">
                  <CardHeader className="cursor-pointer" onClick={() => setShowAdvanced((current) => !current)}>
                    <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />高级洞察</span>
                      {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                  {showAdvanced ? (
                    <CardContent className="space-y-3">
                      {report.advancedInsights?.length ? (
                        report.advancedInsights.map((insight) => (
                          <div key={insight.key} className="rounded-2xl border p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium">{insight.label}</div>
                              <Badge variant="outline">{insight.evidenceLevel}</Badge>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                              {insight.failureReason ?? "数据已满足展示条件，以下为增强层结果。"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border p-4 text-sm text-muted-foreground">当前没有可展示的高级洞察。</div>
                      )}
                    </CardContent>
                  ) : null}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
