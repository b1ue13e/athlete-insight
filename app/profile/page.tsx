"use client"

import Link from "next/link"
import { Activity, Award, TrendingUp, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { mockStorage, sampleAthlete, performanceTags } from "@/lib/sample-data"
import { formatDate, getScoreColor } from "@/lib/utils"
import { ProfileTrendChart } from "./trend-chart"

export default function ProfilePage() {
  const sessions = mockStorage.getSessionsByAthlete(sampleAthlete.id)
  const completedSessions = sessions.filter((s) => s.status === "completed")

  // Calculate stats
  const avgScore = completedSessions.length > 0
    ? completedSessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / completedSessions.length
    : 0

  const scoreTrend = completedSessions.length >= 2
    ? (completedSessions[0].overall_score || 0) - (completedSessions[completedSessions.length - 1].overall_score || 0)
    : 0

  // Collect all tags from sessions
  const allTags = completedSessions.flatMap((s) => s.report_json?.tags || [])
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topIssues = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">运动员档案</h1>
        <p className="text-muted-foreground mt-1">
          把单次表现串起来，才能看见真正的成长路径。
        </p>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{sampleAthlete.name}</h2>
                <Badge variant="secondary">{sampleAthlete.primary_sport === "volleyball" ? "排球" : sampleAthlete.primary_sport}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {sampleAthlete.position && (
                  <span>位置: {sampleAthlete.position}</span>
                )}
                {sampleAthlete.height_cm && (
                  <span>身高: {sampleAthlete.height_cm}cm</span>
                )}
                {sampleAthlete.weight_kg && (
                  <span>体重: {sampleAthlete.weight_kg}kg</span>
                )}
                {sampleAthlete.experience_level && (
                  <span>级别: {sampleAthlete.experience_level}</span>
                )}
              </div>
              {sampleAthlete.notes && (
                <p className="text-sm mt-2 text-muted-foreground">{sampleAthlete.notes}</p>
              )}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-4xl font-bold">{completedSessions.length}</div>
              <div className="text-sm text-muted-foreground">次分析</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">长期均分</span>
            </div>
            <div className={`text-3xl font-bold mt-2 ${getScoreColor(avgScore)}`}>
              {avgScore.toFixed(0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">评分趋势</span>
            </div>
            <div className={`text-3xl font-bold mt-2 ${scoreTrend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {scoreTrend > 0 ? "+" : ""}{scoreTrend.toFixed(0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">最高评分</span>
            </div>
            <div className="text-3xl font-bold mt-2">
              {completedSessions.length > 0
                ? Math.max(...completedSessions.map((s) => s.overall_score || 0))
                : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">最近分析</span>
            </div>
            <div className="text-lg font-bold mt-2">
              {completedSessions.length > 0
                ? formatDate(completedSessions[0].session_date)
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {completedSessions.length >= 2 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>长期趋势</CardTitle>
            <CardDescription>评分、稳定性和主要问题标签的变化</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileTrendChart sessions={completedSessions} />
          </CardContent>
        </Card>
      )}

      {/* Performance Tags */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Issues */}
        <Card>
          <CardHeader>
            <CardTitle>高频问题</CardTitle>
            <CardDescription>你最常出现的短板类型</CardDescription>
          </CardHeader>
          <CardContent>
            {topIssues.length === 0 ? (
              <p className="text-muted-foreground">暂无足够数据</p>
            ) : (
              <div className="space-y-4">
                {topIssues.map(([tag, count]) => {
                  const tagInfo = performanceTags.find((t) => t.code === tag)
                  const percentage = (count / completedSessions.length) * 100
                  return (
                    <div key={tag}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">{tagInfo?.name || tag}</span>
                        <span className="text-sm text-muted-foreground">
                          {count}次 ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Profile */}
        <Card>
          <CardHeader>
            <CardTitle>表现画像</CardTitle>
            <CardDescription>基于历史数据的综合判断</CardDescription>
          </CardHeader>
          <CardContent>
            {completedSessions.length === 0 ? (
              <p className="text-muted-foreground">暂无足够数据</p>
            ) : (
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">类型判断</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getAthleteType(completedSessions)}
                  </p>
                </div>
                <div className="border-l-4 border-emerald-500 pl-4">
                  <h4 className="font-semibold text-emerald-700">稳定优势</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getStrengthSummary(completedSessions)}
                  </p>
                </div>
                <div className="border-l-4 border-amber-500 pl-4">
                  <h4 className="font-semibold text-amber-700">改进重点</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {topIssues.length > 0
                      ? `重点关注${performanceTags.find((t) => t.code === topIssues[0][0])?.name || topIssues[0][0]}的改进`
                      : "暂无突出问题"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getAthleteType(sessions: ReturnType<typeof mockStorage.getAllSessions>): string {
  const avgScore = sessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / sessions.length
  const scores = sessions.map((s) => s.overall_score || 0)
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  if (avgScore >= 80 && stdDev < 10) return "稳定型选手：整体表现优秀且波动小"
  if (avgScore >= 75) return "高上限型：能力出色但稳定性有待提升"
  if (stdDev > 15) return "波动型：状态起伏较大，需要加强稳定性训练"
  if (avgScore >= 60) return "成长型：基础扎实，有提升空间"
  return "基础夯实型：建议系统提升各项技术指标"
}

function getStrengthSummary(sessions: ReturnType<typeof mockStorage.getAllSessions>): string {
  // Collect all strengths from reports
  const allStrengths = sessions.flatMap((s) => s.report_json?.strengths || [])
  const strengthTitles = allStrengths.map((s) => s.title)
  
  // Count occurrences
  const counts = strengthTitles.reduce((acc, title) => {
    acc[title] = (acc[title] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Get top strength
  const topStrength = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  
  if (topStrength) {
    return `${topStrength[0]} 在 ${topStrength[1]} 次分析中被提及，是你的核心优势`
  }
  
  return "持续训练中，优势特征正在形成"
}
