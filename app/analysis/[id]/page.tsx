"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Share2, Download, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReportData } from "@/lib/report-engine"
import { errorTagOptions } from "@/types/errors"

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = params.id as string
    const stored = localStorage.getItem(`report_${id}`)
    
    if (stored) {
      setReport(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [params.id])

  const handleDelete = () => {
    if (!report) return
    if (!confirm("确定要删除这份报告吗？此操作不可撤销。")) return
    
    // 删除报告
    localStorage.removeItem(`report_${report.id}`)
    
    // 从列表中移除
    const reports = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
    const filtered = reports.filter((r: any) => r.id !== report.id)
    localStorage.setItem("athlete_reports", JSON.stringify(filtered))
    
    router.push("/" as any)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">加载中...</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-4">报告不存在或已被删除</p>
          <Link
            href="/"
            className="text-[var(--accent)] hover:underline"
          >
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const date = new Date(report.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
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
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("分享功能开发中")}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-sharp"
              title="分享"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert("导出功能开发中")}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-sharp"
              title="导出"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--negative)] transition-sharp"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-14">
        {/* Hero Section - 大分数 */}
        <section className="pt-16 pb-8 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="editorial-title mb-4">
              {report.matchName}
              {report.opponent && ` vs ${report.opponent}`}
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
                  {report.athleteName}
                </h1>
                <p className="text-[var(--text-secondary)]">
                  {report.position} // {date}
                </p>
              </div>
              
              <div className="flex items-baseline gap-4">
                <div className={cn(
                  "text-[120px] font-bold leading-none tracking-tighter",
                  report.overview.overallScore >= 70 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                )}>
                  {report.overview.overallScore}
                </div>
                <div className="text-[var(--text-muted)] text-sm">
                  综合<br/>评分
                </div>
              </div>
            </div>
            
            {/* 结论 */}
            <div className="mt-8 p-6 border-l-2 border-[var(--accent)] bg-[var(--accent)]/5">
              <div className="text-xl text-[var(--text-primary)] font-medium">
                {report.overview.verdict}
              </div>
              <p className="text-[var(--text-secondary)] mt-2">
                {report.overview.summary}
              </p>
            </div>
          </div>
        </section>

        {/* 维度得分 - Performance Strips */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-6">
              维度分析
            </h2>
            
            <div className="space-y-0">
              <PerformanceStrip
                label="SCORING"
                subtitle="得分贡献"
                score={report.subScores.scoring}
              />
              <PerformanceStrip
                label="CONTROL"
                subtitle="失误控制"
                score={report.subScores.errorControl}
              />
              <PerformanceStrip
                label="STABILITY"
                subtitle="稳定性"
                score={report.subScores.stability}
              />
              <PerformanceStrip
                label="CLUTCH"
                subtitle="关键分表现"
                score={report.subScores.clutch}
                isLast
              />
            </div>
          </div>
        </section>

        {/* 优势与问题 - Editorial Panels */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* 优势 */}
              <div className="panel">
                <div className="p-4 border-b border-[var(--line-default)]">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                    STRENGTHS
                  </div>
                  <div className="text-sm text-[var(--text-muted)] mt-1">
                    这场比赛的亮点
                  </div>
                </div>
                <div className="p-4">
                  {report.strengths.length > 0 ? (
                    <ul className="space-y-3">
                      {report.strengths.map((strength, i) => (
                        <li key={i} className="flex gap-3 text-[var(--text-primary)]">
                          <span className="text-[var(--accent)]">+</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[var(--text-muted)]">暂无突出优势</p>
                  )}
                </div>
              </div>
              
              {/* 问题 */}
              <div className="panel">
                <div className="p-4 border-b border-[var(--line-default)]">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--negative)]">
                    WEAKNESSES
                  </div>
                  <div className="text-sm text-[var(--text-muted)] mt-1">
                    需要改进的地方
                  </div>
                </div>
                <div className="p-4">
                  {report.weaknesses.length > 0 ? (
                    <ul className="space-y-3">
                      {report.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex gap-3 text-[var(--text-primary)]">
                          <span className="text-[var(--negative)]">−</span>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[var(--text-muted)]">表现均衡</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 失误标签 */}
        {report.errorTags.length > 0 && (
          <section className="px-6 pb-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
                失误类型
              </h2>
              <div className="flex flex-wrap gap-2">
                {report.errorTags.map((tagId) => {
                  const tag = errorTagOptions.find(t => t.id === tagId)
                  if (!tag) return null
                  return (
                    <div
                      key={tagId}
                      className="px-3 py-1.5 border border-[var(--line-default)] text-sm text-[var(--text-secondary)]"
                      title={tag.description}
                    >
                      {tag.label}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* 训练建议 */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-6">
              训练建议
            </h2>
            
            <div className="space-y-4">
              {/* P1 - 高优先级 */}
              {report.recommendations.highPriority.length > 0 && (
                <div className="panel border-l-2 border-l-[var(--negative)]">
                  <div className="p-4 border-b border-[var(--line-default)]">
                    <span className="text-[10px] tracking-[0.2em] text-[var(--negative)]">P1</span>
                    <span className="text-sm text-[var(--text-muted)] ml-2">优先解决</span>
                  </div>
                  <ul className="p-4 space-y-2">
                    {report.recommendations.highPriority.map((rec, i) => (
                      <li key={i} className="text-[var(--text-primary)]">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* P2 - 中优先级 */}
              {report.recommendations.mediumPriority.length > 0 && (
                <div className="panel border-l-2 border-l-[var(--warning)]">
                  <div className="p-4 border-b border-[var(--line-default)]">
                    <span className="text-[10px] tracking-[0.2em] text-[var(--warning)]">P2</span>
                    <span className="text-sm text-[var(--text-muted)] ml-2">持续关注</span>
                  </div>
                  <ul className="p-4 space-y-2">
                    {report.recommendations.mediumPriority.map((rec, i) => (
                      <li key={i} className="text-[var(--text-primary)]">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* P3 - 低优先级 */}
              {report.recommendations.lowPriority.length > 0 && (
                <div className="panel border-l-2 border-l-[var(--info)]">
                  <div className="p-4 border-b border-[var(--line-default)]">
                    <span className="text-[10px] tracking-[0.2em] text-[var(--info)]">P3</span>
                    <span className="text-sm text-[var(--text-muted)] ml-2">锦上添花</span>
                  </div>
                  <ul className="p-4 space-y-2">
                    {report.recommendations.lowPriority.map((rec, i) => (
                      <li key={i} className="text-[var(--text-primary)]">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 数据质量说明 */}
        <section className="px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start gap-3 p-4 border border-[var(--line-default)]">
              <AlertCircle className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
              <div className="text-sm text-[var(--text-muted)]">
                <div className="font-medium text-[var(--text-secondary)] mb-1">
                  数据说明
                </div>
                <p>
                  本报告基于
                  {report.metadata.mode === "quick" ? "快速模式" : "专业模式"}
                  生成
                  {report.metadata.dataCertainty === "subjective" && "，部分数据为主观评估"}
                  {report.metadata.dataCertainty === "estimated" && "，部分数据为估算值"}
                  。建议结合比赛录像综合判断。
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// 性能条组件
function PerformanceStrip({ 
  label, 
  subtitle, 
  score, 
  isLast = false 
}: { 
  label: string
  subtitle: string
  score: number
  isLast?: boolean
}) {
  const getScoreColor = (s: number) => {
    if (s >= 75) return "bg-[var(--accent)]"
    if (s >= 60) return "bg-[var(--info)]"
    if (s >= 45) return "bg-[var(--warning)]"
    return "bg-[var(--negative)]"
  }

  return (
    <div className={cn(
      "py-6 flex items-center gap-6",
      !isLast && "border-b border-[var(--line-default)]"
    )}>
      <div className="w-24 shrink-0">
        <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)]">
          {label}
        </div>
        <div className="text-sm text-[var(--text-secondary)]">
          {subtitle}
        </div>
      </div>
      
      <div className="flex-1">
        <div className="h-2 bg-[var(--bg-tertiary)] relative overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", getScoreColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      
      <div className="w-16 text-right">
        <span className={cn(
          "text-2xl font-bold",
          score >= 75 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
        )}>
          {score}
        </span>
      </div>
    </div>
  )
}
