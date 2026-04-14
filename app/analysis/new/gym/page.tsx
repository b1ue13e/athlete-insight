"use client"

import { useCallback, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, getScoreColor } from "@/lib/utils"
import {
  analyzeGymWeeklyBlock,
  calculateGymScore,
  type CompoundOrIsolation,
  type Equipment,
  type ExerciseSetEntry,
  type GymAnalysisResult,
  type GymGoalType,
  type GymSessionInput,
  type GymSessionTag,
  type GymSplitType,
  type MovementPattern,
} from "@/lib/scoring/gym"

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

const DIMENSIONS: Record<keyof GymAnalysisResult["scoreBreakdown"], string> = {
  completion: "训练完成度",
  stimulusQuality: "刺激质量",
  loadReasonableness: "负荷合理性",
  goalAlignment: "目标匹配度",
}

const DEVIATIONS: Record<string, string> = {
  push_pull_imbalance: "推拉失衡",
  effective_sets_insufficient: "有效组不足",
  accessory_over_main_lift: "辅助动作盖过主项",
  intensity_too_low_for_strength: "力量目标下强度偏低",
  volume_too_low_for_hypertrophy: "增肌目标下训练量偏低",
  excessive_fatigue_risk: "疲劳风险偏高",
  compound_lift_missing: "主复合动作缺失",
  back_volume_insufficient: "背部刺激不足",
  leg_training_avoidance: "腿部刺激不足",
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

const verdict = (score: number) => score >= 85 ? "这次训练基本练到点上了。" : score >= 70 ? "这次训练总体有效，但还有结构细节要收紧。" : score >= 55 ? "这次训练有刺激，但没有稳定服务当前目标。" : "这次训练明显跑偏，建议下次先保住主项。"

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
  const [goalType, setGoalType] = useState<GymGoalType>("hypertrophy")
  const [splitType, setSplitType] = useState<GymSplitType>("ppl")
  const [sessionTag, setSessionTag] = useState<GymSessionTag>("push")
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [durationMin, setDurationMin] = useState("65")
  const [perceivedFatigue, setPerceivedFatigue] = useState("")
  const [soreness, setSoreness] = useState("")
  const [sleepQuality, setSleepQuality] = useState("")
  const [exercises, setExercises] = useState<ExerciseDraft[]>([{ ...EMPTY }])
  const [report, setReport] = useState<GymAnalysisResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const buildInput = useCallback((): GymSessionInput => {
    const parsed = exercises.map(buildExercise).filter((exercise) => exercise.exerciseName.length > 0)
    if (parsed.length === 0) throw new Error("至少填写一个动作，报告才有判断基础。")
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
    if (!report) return null
    try { return analyzeGymWeeklyBlock([buildInput()]) } catch { return null }
  }, [buildInput, report])

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((current) => current.map((exercise, i) => i === index ? { ...exercise, ...patch } : exercise))
  }

  function handleAnalyze() {
    try {
      setReport(calculateGymScore(buildInput()))
      setErrorMessage(null)
    } catch (error) {
      setReport(null)
      setErrorMessage(error instanceof Error ? error.message : "生成 Gym 报告失败，请检查输入。")
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%)] py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline">Gym Score v1.0</Badge><Badge variant="secondary">手动输入优先</Badge></div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">健身训练质量诊断</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">不是记流水账，而是判断这次训练有没有真正练到点上，并直接告诉你最该修正什么。</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <Card>
            <CardHeader><CardTitle className="text-base sm:text-lg">训练输入</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2"><Label>目标模板</Label><Select value={goalType} onValueChange={(value) => setGoalType(value as GymGoalType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(GOALS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>分化模板</Label><Select value={splitType} onValueChange={(value) => setSplitType(value as GymSplitType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SPLITS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>今日标签</Label><Select value={sessionTag} onValueChange={(value) => setSessionTag(value as GymSessionTag)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TAGS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2"><Label>日期</Label><Input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} /></div>
                <div className="space-y-2"><Label>时长</Label><Input type="number" value={durationMin} onChange={(event) => setDurationMin(event.target.value)} /></div>
                <div className="space-y-2"><Label>主观疲劳</Label><Input value={perceivedFatigue} onChange={(event) => setPerceivedFatigue(event.target.value)} placeholder="可选，1-10" /></div>
                <div className="space-y-2"><Label>酸痛 / 睡眠</Label><div className="grid grid-cols-2 gap-2"><Input value={soreness} onChange={(event) => setSoreness(event.target.value)} placeholder="酸痛" /><Input value={sleepQuality} onChange={(event) => setSleepQuality(event.target.value)} placeholder="睡眠" /></div></div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between"><div><Label>动作列表</Label><p className="mt-1 text-xs text-muted-foreground">每组数据支持单值或逗号序列，例如 `8,8,8`。</p></div><Button type="button" variant="outline" size="sm" onClick={() => setExercises((current) => [...current, { ...EMPTY }])}>添加动作</Button></div>
                {exercises.map((exercise, index) => (
                  <div key={`exercise-${index}`} className="rounded-2xl border p-4">
                    <div className="mb-4 flex items-center justify-between"><div className="text-sm font-medium">动作 {index + 1}</div>{exercises.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setExercises((current) => current.filter((_, i) => i !== index))}>删除</Button>}</div>
                    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>动作名称</Label><Input value={exercise.exerciseName} onChange={(event) => updateExercise(index, { exerciseName: event.target.value })} /></div><div className="space-y-2"><Label>目标肌群</Label><Input value={exercise.primaryMuscles} onChange={(event) => updateExercise(index, { primaryMuscles: event.target.value })} /></div></div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="space-y-2"><Label>动作模式</Label><Select value={exercise.movementPattern} onValueChange={(value) => updateExercise(index, { movementPattern: value as MovementPattern })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PATTERNS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>器械</Label><Select value={exercise.equipment} onValueChange={(value) => updateExercise(index, { equipment: value as Equipment })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EQUIPMENT).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>动作类型</Label><Select value={exercise.compoundOrIsolation} onValueChange={(value) => updateExercise(index, { compoundOrIsolation: value as CompoundOrIsolation })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compound">复合动作</SelectItem><SelectItem value="isolation">孤立动作</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>组数</Label><Input value={exercise.sets} onChange={(event) => updateExercise(index, { sets: event.target.value })} /></div></div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="space-y-2"><Label>次数</Label><Input value={exercise.repsPerSet} onChange={(event) => updateExercise(index, { repsPerSet: event.target.value })} /></div><div className="space-y-2"><Label>重量</Label><Input value={exercise.loadPerSet} onChange={(event) => updateExercise(index, { loadPerSet: event.target.value })} /></div><div className="space-y-2"><Label>RPE</Label><Input value={exercise.rpePerSet} onChange={(event) => updateExercise(index, { rpePerSet: event.target.value })} /></div><div className="space-y-2"><Label>RIR</Label><Input value={exercise.rirPerSet} onChange={(event) => updateExercise(index, { rirPerSet: event.target.value })} /></div></div>
                  </div>
                ))}
              </div>

              {errorMessage && <Alert variant="destructive"><AlertTitle>无法生成报告</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>}
              <Button className="w-full" onClick={handleAnalyze}>生成 Gym Score 报告</Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!report ? <Card><CardHeader><CardTitle className="text-base sm:text-lg">报告预览</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><div className="rounded-2xl border p-4">你会先看到一句结论，再看到四维评分和最需要修正的一点。</div><div className="rounded-2xl border p-4">偏差区不会堆砌术语，而是直接告诉你这次哪里跑偏、下次怎么调。</div></CardContent></Card> : <>
              <Card className="border-2 border-primary/20"><CardContent className="space-y-4 pt-6"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{GOALS[goalType]}</Badge><Badge variant="outline">{TAGS[sessionTag]}</Badge><Badge variant="outline">{SPLITS[splitType]}</Badge></div><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-sm text-muted-foreground">今日训练结论</div><h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{verdict(report.finalGymScore)}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{report.strongestSignal}</p></div><div className="rounded-2xl border bg-background px-4 py-3 sm:min-w-[170px] sm:text-right"><div className="text-xs text-muted-foreground">Final Gym Score</div><div className={cn("mt-1 text-4xl font-bold", getScoreColor(report.finalGymScore))}>{report.finalGymScore}</div><div className="mt-2 text-xs text-muted-foreground">区间 {report.scoreRange.lower} - {report.scoreRange.upper}</div><Badge className="mt-2" variant={report.confidenceBand === "high" ? "default" : report.confidenceBand === "medium" ? "secondary" : "destructive"}>可信度 {report.confidenceBand}</Badge></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><div className="text-sm font-medium text-emerald-700">最值得肯定</div><div className="mt-2 text-sm leading-6 text-muted-foreground">{report.strongestSignal}</div></div><div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4"><div className="text-sm font-medium text-red-700">最需要修正</div><div className="mt-2 text-sm leading-6 text-muted-foreground">{report.biggestCorrection}</div></div></div></CardContent></Card>

              {report.confidence.confidenceReasons.length > 0 && report.confidenceBand !== "high" && <Alert><AlertTitle>这份报告可以看，但别过度解读</AlertTitle><AlertDescription className="flex flex-wrap gap-2">{report.confidence.confidenceReasons.map((reason) => <Badge key={reason} variant="outline">{reason}</Badge>)}</AlertDescription></Alert>}

              <Card><CardHeader><CardTitle className="text-base sm:text-lg">四维评分</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{Object.entries(report.scoreBreakdown).map(([key, dimension]) => <div key={key} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium">{DIMENSIONS[key as keyof typeof DIMENSIONS]}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{dimension.summary}</p></div><div className={cn("text-2xl font-bold", getScoreColor(dimension.score))}>{dimension.score}</div></div><Progress value={dimension.score} className="mt-4 h-2" /></div>)}</CardContent></Card>

              <Card><CardHeader><CardTitle className="text-base sm:text-lg">偏差诊断</CardTitle></CardHeader><CardContent className="space-y-3">{report.detectedDeviations.length === 0 ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700">这次没有检测到明显结构性跑偏，可以沿着当前主线小幅推进。</div> : report.detectedDeviations.map((deviation) => <div key={deviation.code} className="rounded-2xl border p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant={deviation.severity === "high" ? "destructive" : "secondary"}>{deviation.severity}</Badge><span className="text-sm font-semibold">{DEVIATIONS[deviation.code] ?? deviation.code}</span></div><p className="mt-3 text-sm leading-6">{deviation.explanation}</p><div className="mt-3 rounded-xl bg-muted/40 p-3 text-sm leading-6"><span className="font-medium">下次怎么调：</span>{deviation.suggestedFix}</div></div>)}</CardContent></Card>

              <Card><CardHeader><CardTitle className="text-base sm:text-lg">下次训练建议</CardTitle></CardHeader><CardContent className="space-y-3">{report.nextSessionSuggestions.map((suggestion, index) => <div key={`${suggestion.title}-${index}`} className="rounded-2xl border p-4"><div className="flex items-start gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</div><div><div className="font-medium">{suggestion.title}</div><p className="mt-2 text-sm leading-6">{suggestion.action}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{suggestion.rationale}</p></div></div></div>)}</CardContent></Card>

              {weeklyPreview && <Card><CardHeader><CardTitle className="text-base sm:text-lg">周训练块预览</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-muted/40 p-4"><div className="text-xs text-muted-foreground">训练次数</div><div className="mt-1 text-2xl font-semibold">{weeklyPreview.totalSessions}</div></div><div className="rounded-2xl bg-muted/40 p-4"><div className="text-xs text-muted-foreground">总时长</div><div className="mt-1 text-2xl font-semibold">{weeklyPreview.totalDuration} min</div></div><div className="col-span-2 rounded-2xl border p-4 sm:col-span-1"><div className="text-xs text-muted-foreground">恢复压力</div><div className="mt-1 text-2xl font-semibold">{weeklyPreview.estimatedRecoveryPressure}</div></div></div><div className="rounded-2xl border p-4 text-sm leading-6 text-muted-foreground">{weeklyPreview.weeklyStructureAssessment}</div></CardContent></Card>}

              <Card className="border-dashed"><CardHeader className="cursor-pointer" onClick={() => setShowAdvanced((current) => !current)}><CardTitle className="flex items-center justify-between text-base sm:text-lg"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />高级洞察</span>{showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</CardTitle></CardHeader>{showAdvanced && <CardContent className="space-y-3">{report.advancedInsights?.length ? report.advancedInsights.map((insight) => <div key={insight.key} className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-3"><div className="font-medium">{insight.label}</div><Badge variant="outline">{insight.evidenceLevel}</Badge></div><p className="mt-3 text-sm text-muted-foreground">{insight.failureReason ?? "数据已满足展示条件，以下为增强层结果。"}</p></div>) : <div className="rounded-2xl border p-4 text-sm text-muted-foreground">当前没有可展示的高级洞察。</div>}</CardContent>}</Card>
            </>}
          </div>
        </div>
      </div>
    </div>
  )
}
