"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  aggregateWeeklyData,
  compareWeeks,
  getRunningSessions,
  getRunningWeekRange,
  labelRunningIntensityBalance,
  labelTrainingType,
  type DatabaseRunningSession,
} from "@/lib/scoring/running"
import { useAuth } from "@/contexts/auth-context"

type WeekOption = {
  start: string
  end: string
  label: string
}

function buildWeekOptions(sessions: DatabaseRunningSession[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const oldestSessionDate = sessions.length > 0 ? new Date(sessions[sessions.length - 1]!.session_date) : today
  oldestSessionDate.setHours(0, 0, 0, 0)

  const spanWeeks = Math.ceil((today.getTime() - oldestSessionDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  const totalWeeks = Math.max(4, Math.min(8, spanWeeks))
  const values: WeekOption[] = []

  for (let index = 0; index < totalWeeks; index += 1) {
    const anchor = new Date(today)
    anchor.setDate(today.getDate() - index * 7)
    const range = getRunningWeekRange(anchor)

    values.push({
      start: range.startDate,
      end: range.endDate,
      label: index === 0 ? "本周" : index === 1 ? "上周" : `${index} 周前`,
    })
  }

  return values
}

export default function WeeklyRunningPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [sessions, setSessions] = useState<DatabaseRunningSession[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isAuthenticated || !user) {
      setSessions([])
      setLoading(false)
      return
    }

    let cancelled = false

    const loadSessions = async () => {
      setLoading(true)
      const result = await getRunningSessions(user.id, { limit: 200 })
      if (cancelled) {
        return
      }

      if (!result.success || !result.sessions) {
        setErrorMessage(result.error || "无法读取跑步训练历史。")
        setSessions([])
        setLoading(false)
        return
      }

      const sorted = [...result.sessions].sort(
        (left, right) => new Date(right.session_date).getTime() - new Date(left.session_date).getTime()
      )

      setSessions(sorted)
      setErrorMessage(null)
      setLoading(false)
    }

    void loadSessions()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, user])

  const weekOptions = useMemo(() => buildWeekOptions(sessions), [sessions])
  const sessionInputs = useMemo(() => sessions.map((session) => session.raw_input), [sessions])
  const blocks = useMemo(
    () => weekOptions.map((week) => aggregateWeeklyData(sessionInputs, week.start, week.end)),
    [sessionInputs, weekOptions]
  )

  const safeIndex = Math.min(selectedIndex, Math.max(blocks.length - 1, 0))
  const current = blocks[safeIndex]
  const previous = safeIndex < blocks.length - 1 ? blocks[safeIndex + 1] : null
  const comparison = current ? compareWeeks(current, previous) : null

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="mx-auto max-w-6xl px-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">正在读取你的跑步训练历史...</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="mx-auto max-w-3xl px-4">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div>
                <div className="text-lg font-semibold">先登录，再看周训练块</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  周复盘现在会直接读取你已保存的真实 running session，不再使用 mock 数据。
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => router.push("/auth/login")}>去登录</Button>
                <Button variant="outline" onClick={() => router.push("/analysis/new/running")}>
                  先做一次单次分析
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="mx-auto max-w-3xl px-4">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="text-lg font-semibold">周复盘读取失败</div>
              <p className="text-sm text-red-600">{errorMessage}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                重新加载
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (sessions.length === 0 || !current || !comparison) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="mx-auto max-w-3xl px-4">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div>
                <div className="text-lg font-semibold">还没有可复盘的跑步历史</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  保存几次单次训练后，这里会自动聚合出真实周训练块，而不是演示数据。
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => router.push("/analysis/new/running")}>新建单次训练报告</Button>
                <Button variant="outline" onClick={() => router.push("/analysis/new/running/import")}>
                  导入手表文件
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Weekly Review</Badge>
            <span className="text-sm text-muted-foreground">这里直接基于已保存的训练记录聚合，不再使用静态样例。</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">周训练块复盘</h1>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {weekOptions.map((week, index) => (
            <Button key={week.start} variant={safeIndex === index ? "default" : "outline"} onClick={() => setSelectedIndex(index)}>
              {week.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-sm text-muted-foreground">周跑量</div>
                    <div className="mt-2 text-3xl font-semibold">{current.totals.totalDistanceKm}</div>
                    <div className="text-sm text-muted-foreground">km</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">训练次数</div>
                    <div className="mt-2 text-3xl font-semibold">{current.totals.sessionsCount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">平均训练质量</div>
                    <div className="mt-2 text-3xl font-semibold">{current.scoreSummary.averageFinalScore}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">结构判断</div>
                    <div className="mt-2 text-lg font-semibold">{labelRunningIntensityBalance(current.structure.intensityBalance)}</div>
                  </div>
                </div>
                <div className="mt-6 rounded-xl bg-muted p-4">
                  <div className="font-medium">{current.findings.blockVerdict}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{current.findings.strongestWeekSignal}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>结构观察</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">轻松 / 恢复占比</div>
                  <div className="mt-2 text-2xl font-semibold">{current.structure.easySharePct}%</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">高质量占比</div>
                  <div className="mt-2 text-2xl font-semibold">{current.structure.qualitySharePct}%</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">长距离完成</div>
                  <div className="mt-2 text-2xl font-semibold">{current.structure.longRunCompleted ? "已完成" : "缺失"}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">休息天数</div>
                  <div className="mt-2 text-2xl font-semibold">{current.totals.restDays}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>单次训练列表</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {current.sessions.length > 0 ? (
                  current.sessions.map((session) => (
                    <div key={session.input.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">{labelTrainingType(session.input.trainingType)}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(session.input.date).toLocaleDateString("zh-CN")} · {session.input.distanceKm} km · {session.input.durationMin} min
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-semibold">{session.report.scoreBreakdown.final.score}</div>
                          <div className="text-xs text-muted-foreground">{session.report.scoreBreakdown.final.range}</div>
                        </div>
                      </div>
                      {session.report.detectedDeviations[0] ? (
                        <div className="mt-3 text-sm text-muted-foreground">
                          {session.report.detectedDeviations[0].label}: {session.report.detectedDeviations[0].summary}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-muted-foreground">没有识别到明显跑偏。</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">这个时间窗里还没有保存过训练。</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>本周主要问题</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-amber-500/5 p-4 text-sm">{current.findings.biggestWeekCorrection}</div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {current.findings.detectedPatterns.map((pattern) => (
                    <div key={pattern}>{pattern}</div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>下周重点</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {current.nextWeekFocus.map((focus) => (
                  <div key={focus} className="rounded-lg border p-4 text-sm">
                    {focus}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>与上周对比</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border p-4">
                  跑量变化 {comparison.changes.distanceChangePct > 0 ? "+" : ""}
                  {comparison.changes.distanceChangePct}%
                </div>
                <div className="rounded-lg border p-4">
                  时长变化 {comparison.changes.durationChangePct > 0 ? "+" : ""}
                  {comparison.changes.durationChangePct}%
                </div>
                <div className="rounded-lg border p-4">
                  平均训练质量变化 {comparison.changes.scoreChange > 0 ? "+" : ""}
                  {comparison.changes.scoreChange}
                </div>
                <div className="space-y-2 text-muted-foreground">
                  {comparison.insights.map((insight) => (
                    <div key={insight}>{insight}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
