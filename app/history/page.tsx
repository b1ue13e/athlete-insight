"use client"

import { useMemo } from "react"
import Link from "next/link"
import { 
  ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, 
  Activity, Minus, AlertCircle
} from "lucide-react"
import { mockStorage, sampleAthlete, performanceTags } from "@/lib/sample-data"
import { formatDate } from "@/lib/utils"
import { AnalysisSession, TrendAnalysis } from "@/types"
import { analyzeVersionConsistency } from "@/lib/scoring-version"

// 表现实验室历史页
// 趋势控制台，不是历史列表

export default function HistoryPage() {
  const sessions = mockStorage.getSessionsByAthlete(sampleAthlete.id)
  const recentSessions = sessions.slice(0, 5)
  
  // 版本一致性
  const versionAnalysis = useMemo(() => {
    const versions = recentSessions.map(s => s.report_json?.meta?.scoring_version || "unknown")
    return analyzeVersionConsistency(versions)
  }, [recentSessions])
  
  // 趋势分析
  const trendAnalysis = useMemo(() => calculateTrendAnalysis(recentSessions), [recentSessions])

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-[var(--text-tertiary)]">暂无分析记录</div>
          <Link 
            href="/analysis/new"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--accent)] text-[var(--accent)] text-sm tracking-wider uppercase hover:bg-[var(--accent)]/10 transition-sharp"
          >
            开始首次分析
          </Link>
        </div>
      </div>
    )
  }

  const latestSession = sessions[0]
  const latestScore = latestSession.overall_score || 0

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] grid-bg">
      {/* 导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-sharp"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm tracking-wide">返回</span>
          </Link>
          
          <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
            表现控制台
          </div>
        </div>
      </nav>

      <main className="pt-14">
        {/* 主视觉 - 趋势结论 */}
        <section className="min-h-[50vh] flex items-center border-b border-[var(--line-default)] relative overflow-hidden">
          <div className="absolute inset-0 data-texture pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-6 w-full py-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* 左侧：运动员信息 */}
              <div className="space-y-6">
                <div>
                  <div className="editorial-title mb-2">运动员</div>
                  <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                    {sampleAthlete.name}
                  </h1>
                  <div className="mt-2 text-[var(--text-secondary)]">
                    {sampleAthlete.position} // {sampleAthlete.primary_sport === "volleyball" ? "排球" : sampleAthlete.primary_sport}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <div className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase">分析次数</div>
                    <div className="font-mono text-xl text-[var(--text-primary)]">{sessions.length}</div>
                  </div>
                  <div className="w-px h-8 bg-[var(--line-strong)]" />
                  <div>
                    <div className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase">平均得分</div>
                    <div className="font-mono text-xl text-[var(--text-primary)]">
                      {Math.round(sessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / sessions.length)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 中间：趋势方向 */}
              {trendAnalysis && (
                <div className="flex flex-col justify-center">
                  <div className="editorial-title mb-4">发展轨迹</div>
                  
                  {versionAnalysis.adjustedTrend ? (
                    <div className="space-y-4">
                      <div className="text-5xl font-bold text-[var(--warning)]">
                        不确定
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm">
                        {versionAnalysis.adjustedTrend.note}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`text-5xl font-bold ${
                        trendAnalysis.long_term_trend.direction === "improving" ? 'text-[var(--positive)]' :
                        trendAnalysis.long_term_trend.direction === "declining" ? 'text-[var(--negative)]' :
                        trendAnalysis.long_term_trend.direction === "fluctuating" ? 'text-[var(--warning)]' :
                        'text-[var(--text-primary)]'
                      }`}>
                        {trendAnalysis.long_term_trend.direction === "improving" ? "上升" :
                         trendAnalysis.long_term_trend.direction === "declining" ? "下降" :
                         trendAnalysis.long_term_trend.direction === "fluctuating" ? "波动" :
                         "平稳"}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                        <span>波动率: {(trendAnalysis.long_term_trend.volatility * 100).toFixed(0)}%</span>
                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                        <span>最佳: {trendAnalysis.long_term_trend.best_score}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 右侧：最新分数 */}
              <div className="flex flex-col justify-center items-start lg:items-end">
                <div className="editorial-title mb-4">最新</div>
                <div className={`font-mono text-7xl font-bold ${
                  latestScore >= 80 ? 'accent-text' :
                  latestScore >= 60 ? 'text-[var(--text-primary)]' :
                  'text-[var(--negative)]'
                }`}>
                  {latestScore}
                </div>
                <div className="mt-2 text-[var(--text-secondary)]">
                  {latestSession.title}
                </div>
                <div className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase mt-1">
                  {formatDate(latestSession.session_date)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 版本警告 */}
        {versionAnalysis.crossVersionAnalysis && (
          <section className="py-4 bg-[var(--warning)]/5 border-b border-[var(--warning)]/20">
            <div className="max-w-7xl mx-auto px-6 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
              <span className="text-sm text-[var(--warning)]">
                检测到跨版本分析。趋势可能受评分规则调整影响。
              </span>
            </div>
          </section>
        )}

        {/* 表现时间线 */}
        <section className="py-16 border-b border-[var(--line-default)]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="editorial-title mb-8">表现时间线</div>
            
            {/* 时间线可视化 */}
            <div className="relative">
              {/* 连接线 */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--line-default)] -translate-y-1/2" />
              
              <div className="grid grid-cols-5 gap-4">
                {[...sessions].reverse().slice(-5).map((session, index) => {
                  const score = session.overall_score || 0
                  const prevScore = index > 0 ? (sessions[sessions.length - 5 + index - 1]?.overall_score || 0) : null
                  const change = prevScore !== null ? score - prevScore : null
                  
                  return (
                    <Link key={session.id} href={`/analysis/${session.id}`}>
                      <div className="relative group cursor-pointer">
                        {/* 分数点 */}
                        <div className={`relative z-10 w-full aspect-square border-2 flex flex-col items-center justify-center transition-sharp group-hover:border-[var(--accent)] ${
                          score >= 80 ? 'border-[var(--positive)]/50 bg-[var(--positive)]/5' :
                          score >= 60 ? 'border-[var(--line-strong)] bg-[var(--bg-secondary)]' :
                          'border-[var(--negative)]/50 bg-[var(--negative)]/5'
                        }`}>
                          <span className={`font-mono text-3xl font-bold ${
                            score >= 80 ? 'text-[var(--positive)]' :
                            score >= 60 ? 'text-[var(--text-primary)]' :
                            'text-[var(--negative)]'
                          }`}>
                            {score}
                          </span>
                          
                          {change !== null && change !== 0 && (
                            <span className={`text-[10px] mt-1 ${
                              change > 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
                            }`}>
                              {change > 0 ? '+' : ''}{change}
                            </span>
                          )}
                        </div>
                        
                        {/* 日期标签 */}
                        <div className="mt-3 text-center">
                          <div className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                            {formatDate(session.session_date).split(' ')[0]}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 分析网格 */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* 高频问题 */}
              {trendAnalysis && trendAnalysis.top_issues.length > 0 && (
                <div>
                  <div className="editorial-title mb-6 text-[var(--negative)]">反复出现的问题</div>
                  <div className="space-y-4">
                    {trendAnalysis.top_issues.map((issue) => {
                      const tagInfo = performanceTags.find(t => t.code === issue.tag)
                      return (
                        <div 
                          key={issue.tag}
                          className="flex items-center justify-between py-4 border-b border-[var(--line-default)]"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-2xl text-[var(--text-primary)]">
                              {issue.occurrence_count}<span className="text-[var(--text-muted)] text-lg">/5</span>
                            </span>
                            <div>
                              <div className="text-sm font-medium text-[var(--text-primary)]">
                                {tagInfo?.name || issue.tag}
                              </div>
                              <div className={`text-[10px] tracking-wider uppercase ${
                                issue.trend === "improving" ? 'text-[var(--positive)]' :
                                issue.trend === "worsening" ? 'text-[var(--negative)]' :
                                'text-[var(--text-muted)]'
                              }`}>
                                {issue.trend === "improving" ? "改善中" : issue.trend === "worsening" ? "恶化" : "稳定"}
                              </div>
                            </div>
                          </div>
                          
                          {/* 迷你进度条 */}
                          <div className="w-24 h-1 bg-[var(--line-default)]">
                            <div 
                              className={`h-full ${
                                issue.trend === "improving" ? 'bg-[var(--positive)]' :
                                issue.trend === "worsening" ? 'bg-[var(--negative)]' :
                                'bg-[var(--text-muted)]'
                              }`}
                              style={{ width: `${(issue.occurrence_count / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 稳定优势 */}
              {trendAnalysis && trendAnalysis.top_strengths.length > 0 && (
                <div>
                  <div className="editorial-title mb-6 text-[var(--positive)]">稳定优势</div>
                  <div className="space-y-4">
                    {trendAnalysis.top_strengths.map((strength) => (
                      <div 
                        key={strength.category}
                        className="flex items-center justify-between py-4 border-b border-[var(--line-default)]"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-2xl text-[var(--positive)]">
                            {strength.average_score.toFixed(0)}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {strength.category === "scoring_contribution" ? "得分贡献" :
                               strength.category === "error_control" ? "失误控制" :
                               strength.category === "stability" ? "稳定性" : "关键分"}
                            </div>
                            <div className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                              {strength.consistency === "high" ? "很稳定" : "较稳定"}
                            </div>
                          </div>
                        </div>
                        
                        {/* 迷你进度条 */}
                        <div className="w-24 h-1 bg-[var(--line-default)]">
                          <div 
                            className="h-full bg-[var(--positive)]"
                            style={{ width: `${strength.average_score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 历史记录列表 */}
        <section className="py-16 bg-[var(--bg-secondary)] border-t border-[var(--line-default)]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="editorial-title mb-8">全部记录</div>
            
            <div className="space-y-0">
              {sessions.map((session, index) => {
                const prevSession = sessions[index + 1]
                const change = prevSession && prevSession.overall_score && session.overall_score
                  ? session.overall_score - prevSession.overall_score
                  : null

                return (
                  <Link key={session.id} href={`/analysis/${session.id}`}>
                    <div className="group flex items-center justify-between py-4 border-b border-[var(--line-default)] hover:border-[var(--accent)]/30 transition-sharp cursor-pointer">
                      <div className="flex items-center gap-6">
                        <span className="font-mono text-2xl font-bold text-[var(--text-primary)] w-16">
                          {session.overall_score}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-sharp">
                            {session.title}
                          </div>
                          <div className="text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                            {formatDate(session.session_date)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {change !== null && (
                          <span className={`flex items-center gap-1 text-sm ${
                            change > 0 ? 'text-[var(--positive)]' : 
                            change < 0 ? 'text-[var(--negative)]' : 
                            'text-[var(--text-muted)]'
                          }`}>
                            {change > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
                             change < 0 ? <ArrowDownRight className="w-4 h-4" /> : 
                             <Minus className="w-4 h-4" />}
                          </span>
                        )}
                        
                        {session.model_version && (
                          <span className="text-[10px] tracking-wider text-[var(--text-muted)]">
                            v{session.model_version}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* 页脚 */}
        <footer className="py-12 border-t border-[var(--line-default)]">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="text-[10px] tracking-wider text-[var(--text-muted)]">
              ATHLETE INSIGHT // 表现控制台
            </div>
            <Link 
              href="/analysis/new"
              className="flex items-center gap-2 px-6 py-3 border border-[var(--accent)] text-[var(--accent)] text-sm tracking-wider uppercase hover:bg-[var(--accent)]/10 transition-sharp"
            >
              新建分析
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}

// 计算趋势分析
function calculateTrendAnalysis(sessions: AnalysisSession[]): TrendAnalysis | null {
  if (sessions.length < 2) return null

  const scores = sessions.map(s => s.overall_score || 0)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const bestScore = Math.max(...scores)
  const worstScore = Math.min(...scores)
  
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length
  const volatility = Math.sqrt(variance)
  
  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2))
  const secondHalf = scores.slice(Math.floor(scores.length / 2))
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  
  let direction: TrendAnalysis["long_term_trend"]["direction"]
  if (volatility > 15) direction = "fluctuating"
  else if (secondAvg > firstAvg + 3) direction = "improving"
  else if (secondAvg < firstAvg - 3) direction = "declining"
  else direction = "stable"

  const latest = sessions[0]
  const previous = sessions[1]
  const scoreChange = (latest.overall_score || 0) - (previous.overall_score || 0)
  
  const significantChanges: TrendAnalysis["vs_previous"]["significant_changes"] = []
  
  const latestSubs = latest.report_json?.overview.sub_scores
  const prevSubs = previous.report_json?.overview.sub_scores
  
  if (latestSubs && prevSubs) {
    const comparisons: Array<[keyof typeof latestSubs, string]> = [
      ["scoring_contribution", "得分贡献"],
      ["error_control", "失误控制"],
      ["stability", "稳定性"],
      ["clutch_performance", "关键分"],
    ]
    
    comparisons.forEach(([key, label]) => {
      const change = latestSubs[key] - prevSubs[key]
      if (Math.abs(change) >= 5) {
        significantChanges.push({
          metric: label,
          previous: prevSubs[key],
          current: latestSubs[key],
          change_percent: (change / prevSubs[key]) * 100,
        })
      }
    })
  }

  const allTags = sessions.flatMap(s => s.report_json?.tags || [])
  const tagCounts: Record<string, number[]> = {}
  
  allTags.forEach((tag, idx) => {
    if (!tagCounts[tag]) tagCounts[tag] = []
    tagCounts[tag].push(idx)
  })
  
  const topIssues = Object.entries(tagCounts)
    .map(([tag, occurrences]) => {
      const firstHalfCount = occurrences.filter(i => i < sessions.length / 2).length
      const secondHalfCount = occurrences.filter(i => i >= sessions.length / 2).length
      
      let trend: TrendAnalysis["top_issues"][0]["trend"]
      if (secondHalfCount < firstHalfCount) trend = "improving"
      else if (secondHalfCount > firstHalfCount) trend = "worsening"
      else trend = "stable"
      
      return { tag, occurrence_count: occurrences.length, trend }
    })
    .sort((a, b) => b.occurrence_count - a.occurrence_count)
    .slice(0, 3)

  const subScoreCategories: Array<[keyof import("@/types").SubScores, string]> = [
    ["scoring_contribution", "scoring_contribution"],
    ["error_control", "error_control"],
    ["stability", "stability"],
    ["clutch_performance", "clutch_performance"],
  ]
  
  const topStrengths = subScoreCategories
    .map(([key, label]) => {
      const values = sessions
        .map(s => s.report_json?.overview.sub_scores?.[key])
        .filter((v): v is number => v !== undefined)
      
      if (values.length === 0) return null
      
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length
      
      return {
        category: label,
        average_score: avg,
        consistency: variance < 50 ? "high" : "medium" as "high" | "medium",
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.average_score >= 65)
    .sort((a, b) => b.average_score - a.average_score)
    .slice(0, 3)

  return {
    vs_previous: {
      score_change: scoreChange,
      direction: scoreChange > 3 ? "up" : scoreChange < -3 ? "down" : "flat",
      significant_changes: significantChanges,
    },
    top_issues: topIssues,
    top_strengths: topStrengths,
    long_term_trend: {
      direction,
      volatility: volatility / 100,
      avg_score: avgScore,
      best_score: bestScore,
      worst_score: worstScore,
    },
  }
}
