"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, User, ChevronRight, FileText, BarChart3 } from "lucide-react"
import { InstallPrompt, IOSInstallHint } from "@/components/pwa/install-prompt"
import { cn } from "@/lib/utils"
import { AthleteProfile, getAthletes, getAthleteStats } from "@/lib/athletes"

interface ReportSummary {
  id: string
  athleteId: string
  athleteName: string
  createdAt: string
  overallScore: number
  verdict: string
}

export default function HomePage() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 加载运动员
    const loadedAthletes = getAthletes()
    setAthletes(loadedAthletes)
    
    // 加载报告
    const storedReports = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
    // 按时间倒序
    storedReports.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    setReports(storedReports.slice(0, 10)) // 最近10条
    
    setIsLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--line-default)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--accent)] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span className="text-sm font-bold tracking-wider text-[var(--text-primary)]">
              ATHLETE INSIGHT
            </span>
          </div>
          
          <Link
            href="/analysis/new"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-bold hover:opacity-90 transition-sharp"
          >
            <Plus className="w-4 h-4" />
            新建分析
          </Link>
        </div>
      </header>

      <main className="pt-14">
        {/* Hero Section */}
        <section className="pt-16 pb-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="editorial-title mb-4 text-[var(--accent)]">
              Performance Lab
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] mb-6">
              运动员表现分析
            </h1>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
              基于比赛数据生成专业分析报告，帮助你客观评估表现、发现问题、制定训练计划。
            </p>
          </div>
        </section>

        {/* 快速操作 */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/analysis/new"
                className="group p-6 border border-[var(--line-default)] hover:border-[var(--accent)] transition-sharp"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-sharp">
                      新建分析报告
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-2">
                      快速模式（2分钟）或专业模式（完整统计）
                    </p>
                  </div>
                  <Plus className="w-6 h-6 text-[var(--accent)]" />
                </div>
              </Link>
              
              <Link
                href="/athletes"
                className="group p-6 border border-[var(--line-default)] hover:border-[var(--accent)] transition-sharp"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-sharp">
                      管理运动员
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-2">
                      查看档案、统计趋势、历史报告
                    </p>
                  </div>
                  <User className="w-6 h-6 text-[var(--accent)]" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* 运动员列表 */}
        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                运动员档案
              </h2>
              <Link
                href="/athletes"
                className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-sharp"
              >
                查看全部 →
              </Link>
            </div>
            
            {isLoading ? (
              <div className="text-[var(--text-muted)]">加载中...</div>
            ) : athletes.length === 0 ? (
              <div className="p-8 border border-dashed border-[var(--line-strong)] text-center">
                <User className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-muted)]">还没有运动员档案</p>
                <Link
                  href="/analysis/new"
                  className="text-[var(--accent)] text-sm mt-2 inline-block hover:underline"
                >
                  创建第一个分析 →
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {athletes.map((athlete) => (
                  <AthleteCard key={athlete.id} athlete={athlete} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 最近报告 */}
        <section className="px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                最近报告
              </h2>
              {reports.length > 0 && (
                <span className="text-sm text-[var(--text-muted)]">
                  共 {reports.length} 份
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div className="text-[var(--text-muted)]">加载中...</div>
            ) : reports.length === 0 ? (
              <div className="p-8 border border-dashed border-[var(--line-strong)] text-center">
                <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-muted)]">还没有分析报告</p>
                <Link
                  href="/analysis/new"
                  className="text-[var(--accent)] text-sm mt-2 inline-block hover:underline"
                >
                  开始第一次分析 →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>
        </section>
        
        {/* PWA 安装提示 */}
        <InstallPrompt />
        <IOSInstallHint />
      </main>
    </div>
  )
}

// 运动员卡片
function AthleteCard({ athlete }: { athlete: AthleteProfile }) {
  const stats = getAthleteStats(athlete.id)
  
  return (
    <Link
      href={`/athletes/${athlete.id}`}
      className="group p-5 border border-[var(--line-default)] hover:border-[var(--accent)] transition-sharp"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-sharp">
            {athlete.name}
          </div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            {athlete.position}
            {athlete.team && ` // ${athlete.team}`}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-sharp" />
      </div>
      
      {stats.totalReports > 0 ? (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--line-default)]">
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
              报告数
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {stats.totalReports}
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
              平均分
            </div>
            <div className={cn(
              "text-lg font-bold",
              stats.averageScore >= 70 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
            )}>
              {stats.averageScore}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-[var(--text-muted)] pt-4 border-t border-[var(--line-default)]">
          暂无分析报告
        </div>
      )}
    </Link>
  )
}

// 报告行
function ReportRow({ report }: { report: ReportSummary }) {
  const date = new Date(report.createdAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })
  
  return (
    <Link
      href={`/analysis/${report.id}`}
      className="group flex items-center justify-between p-4 border border-[var(--line-default)] hover:border-[var(--accent)] transition-sharp"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 flex items-center justify-center border",
          report.overallScore >= 70 
            ? "border-[var(--accent)] text-[var(--accent)]" 
            : "border-[var(--line-strong)] text-[var(--text-secondary)]"
        )}>
          <span className="text-lg font-bold">{report.overallScore}</span>
        </div>
        
        <div>
          <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-sharp">
            {report.athleteName}
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {report.verdict} // {date}
          </div>
        </div>
      </div>
      
      <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-sharp" />
    </Link>
  )
}
