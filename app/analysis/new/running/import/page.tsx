"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getOrCreateDefaultAthlete, parseActivityFile, convertToRunningInput, saveRunningSession, type ImportPreview, type ParsedActivity, type RunningGoalType, type RunningTrainingType } from "@/lib/scoring/running"
import { analyzeRunningActivity } from "@/lib/analysis/pipeline"
import { saveCanonicalDiagnosisRecord } from "@/lib/analysis/store"
import { useAuth } from "@/contexts/auth-context"

type Step = "upload" | "preview" | "done"

function paceLabel(value: number) {
  const min = Math.floor(value / 60)
  const sec = Math.round(value % 60)
  return `${min}:${String(sec).padStart(2, "0")}/km`
}

export default function RunningImportPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [step, setStep] = useState<Step>("upload")
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [activity, setActivity] = useState<ParsedActivity | null>(null)
  const [trainingType, setTrainingType] = useState<RunningTrainingType>("easy")
  const [goalType, setGoalType] = useState<RunningGoalType | "none">("none")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedDiagnosisId, setSavedDiagnosisId] = useState<string | null>(null)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const parsed = await parseActivityFile(file)
    if (!parsed.success || !parsed.activity) {
      setErrorMessage(parsed.error || "文件解析失败。")
      return
    }

    const nextPreview = convertToRunningInput(parsed.activity)
    setActivity(parsed.activity)
    setPreview(nextPreview)
    setTrainingType(nextPreview.detectedType as RunningTrainingType)
    setGoalType("none")
    setErrorMessage(null)
    setStep("preview")
  }, [])

  const dropzone = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/gpx+xml": [".gpx"],
      "application/tcx+xml": [".tcx"],
      "application/octet-stream": [".fit"],
    },
  })

  const handleImport = async () => {
    if (!preview || !isAuthenticated || !user) {
      router.push("/auth/login")
      return
    }

    setSaving(true)
    const input = {
      ...preview.suggestedInput,
      trainingType,
      goalType: goalType === "none" ? undefined : goalType,
    }

    try {
      const analysis = analyzeRunningActivity(input)
      const athleteResult = await getOrCreateDefaultAthlete(user.id, user.email)
      if (!athleteResult.success || !athleteResult.athleteId) {
        setErrorMessage(athleteResult.error || "无法创建跑者档案。")
        setSaving(false)
        return
      }

      const result = await saveRunningSession(user.id, athleteResult.athleteId, analysis.input, analysis.report)
      setSaving(false)

      if (!result.success) {
        setErrorMessage(result.error || "导入失败。")
        return
      }

      await saveCanonicalDiagnosisRecord({
        id: result.id ?? analysis.report.sessionId,
        analysisSessionId: result.id,
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

      setSavedDiagnosisId(analysis.report.sessionId)
      setStep("done")
    } catch (error) {
      setSaving(false)
      setErrorMessage(error instanceof Error ? error.message : "导入失败。")
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Import</Badge>
            <span className="text-sm text-muted-foreground">导入后仍然按 Running Score v1.0 主规则复盘。</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">导入跑步文件</h1>
        </div>

        {step === "upload" ? (
          <Card>
            <CardContent className="pt-6">
              <div
                {...dropzone.getRootProps()}
                className="rounded-xl border-2 border-dashed p-12 text-center"
              >
                <input {...dropzone.getInputProps()} />
                <div className="text-lg font-medium">拖入 GPX / TCX 文件，或点击选择</div>
                <div className="mt-2 text-sm text-muted-foreground">高级时序数据会被保留为 Advanced Insights 的输入，但不影响主评分。</div>
              </div>
              {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        {step === "preview" && preview && activity ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>文件预览</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">距离</div>
                  <div className="mt-2 text-2xl font-semibold">{activity.totalDistance.toFixed(1)} km</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">时长</div>
                  <div className="mt-2 text-2xl font-semibold">{Math.round(activity.totalDuration / 60)} min</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">平均配速</div>
                  <div className="mt-2 text-2xl font-semibold">{paceLabel(activity.avgPace)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>确认训练语义</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>训练类型</Label>
                  <Select value={trainingType} onValueChange={(value) => setTrainingType(value as RunningTrainingType)}>
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
                  <Select value={goalType} onValueChange={(value) => setGoalType(value as RunningGoalType | "none")}>
                    <SelectTrigger>
                      <SelectValue />
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
              </CardContent>
            </Card>

            {preview.issues.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>导入提醒</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {preview.issues.map((issue) => (
                    <div key={issue}>{issue}</div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>重新选择文件</Button>
              <Button onClick={handleImport} disabled={saving}>{saving ? "导入中..." : "导入并生成报告"}</Button>
            </div>
          </div>
        ) : null}

        {step === "done" ? (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-xl font-semibold">导入完成</div>
                <p className="text-sm text-muted-foreground">训练记录已进入 Running Score v1.0 主流程。</p>
                <div className="flex gap-3">
                  <Button onClick={() => router.push("/running")}>返回跑步首页</Button>
                  <Button variant="outline" onClick={() => setStep("upload")}>继续导入</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
