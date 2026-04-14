"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildRunningWeeklyPreview,
  getRunningSessions,
  labelRunningIntensityBalance,
  type DatabaseRunningSession,
} from "@/lib/scoring/running"
import { useAuth } from "@/contexts/auth-context"

export default function RunningHomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [sessions, setSessions] = useState<DatabaseRunningSession[]>([])
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isAuthenticated || !user) {
      setSessions([])
      setPreviewError(null)
      setLoadingPreview(false)
      return
    }

    let cancelled = false

    const loadSessions = async () => {
      setLoadingPreview(true)
      const result = await getRunningSessions(user.id, { limit: 200 })
      if (cancelled) {
        return
      }

      if (!result.success || !result.sessions) {
        setSessions([])
        setPreviewError(result.error || "无法读取本周训练预览。")
        setLoadingPreview(false)
        return
      }

      setSessions(result.sessions)
      setPreviewError(null)
      setLoadingPreview(false)
    }

    void loadSessions()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, user])

  const weeklyPreview = useMemo(
    () => buildRunningWeeklyPreview(sessions.map((session) => session.raw_input)),
    [sessions]
  )

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Running Score v1.0</Badge>
            <span className="text-sm text-muted-foreground">先判断这次训练有没有练对，再看原因与修正。</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">跑步训练</h1>
          <p className="mt-2 text-muted-foreground">
            主结论由规则和统计给出，高级生理指标只做补充解释，不主导主评分。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">单次训练报告</div>
                <h2 className="text-2xl font-semibold">记录并复盘这次训练</h2>
                <p className="text-sm text-muted-foreground">
                  重点回答三件事：有没有练对、主要跑偏在哪、下次要怎么改。
                </p>
                <Button onClick={() => router.push("/analysis/new/running")}>开始分析</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">本周训练块预览</div>

                {isLoading || loadingPreview ? (
                  <>
                    <h2 className="text-2xl font-semibold">正在读取本周训练块</h2>
                    <p className="text-sm text-muted-foreground">会直接使用已保存的 running session 聚合，不再显示静态示意文案。</p>
                  </>
                ) : !isAuthenticated || !user ? (
                  <>
                    <h2 className="text-2xl font-semibold">登录后查看真实周结论</h2>
                    <p className="text-sm text-muted-foreground">登录后这里会直接显示本周有没有持续练对，以及最需要修正的结构问题。</p>
                  </>
                ) : previewError ? (
                  <>
                    <h2 className="text-2xl font-semibold">本周预览暂时不可用</h2>
                    <p className="text-sm text-destructive">{previewError}</p>
                  </>
                ) : weeklyPreview.hasSessions ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{labelRunningIntensityBalance(weeklyPreview.block.structure.intensityBalance)}</Badge>
                      <Badge variant="outline">{weeklyPreview.block.totals.sessionsCount} 次训练</Badge>
                    </div>
                    <h2 className="text-2xl font-semibold">{weeklyPreview.block.findings.blockVerdict}</h2>
                    <p className="text-sm text-muted-foreground">{weeklyPreview.detail}</p>
                    <p className="text-sm text-muted-foreground">{weeklyPreview.block.findings.biggestWeekCorrection}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold">本周还没有可复盘记录</h2>
                    <p className="text-sm text-muted-foreground">先保存几次单次训练，首页这里就会自动长出真实周块预览。</p>
                  </>
                )}

                <Button variant="outline" onClick={() => router.push("/analysis/running/weekly")}>
                  进入周复盘
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">手动输入优先</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              没有手表也能用，距离、时长、配速和主观强度已经足够判断多数训练偏差。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">高级洞察独立展示</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              心率解耦、阈值估计和动作衰减只出现在折叠区，不参与主评分。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">遥测页继续保留</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>高级时序图表仍然可用，但不再作为跑步主入口。</p>
              <Button variant="ghost" className="px-0" onClick={() => router.push("/telemetry/running")}>
                打开高级遥测
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
