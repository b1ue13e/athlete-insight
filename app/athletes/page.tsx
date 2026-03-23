"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, User, ChevronRight, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AthleteProfile, getAthletes, getAthleteStats, deleteAthlete } from "@/lib/athletes"

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setAthletes(getAthletes())
    setIsLoading(false)
  }, [])

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除这位运动员吗？相关报告也会被删除。")) return
    
    deleteAthlete(id)
    
    // 删除相关报告
    const reports = JSON.parse(localStorage.getItem("athlete_reports") || "[]")
    const filteredReports = reports.filter((r: any) => r.athleteId !== id)
    localStorage.setItem("athlete_reports", JSON.stringify(filteredReports))
    
    setAthletes(getAthletes())
  }

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
          
          <Link
            href="/analysis/new"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-bold hover:opacity-90 transition-sharp"
          >
            <Plus className="w-4 h-4" />
            新建分析
          </Link>
        </div>
      </nav>

      <main className="pt-14">
        <section className="pt-16 pb-8 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="editorial-title mb-4 text-[var(--accent)]">
              ATHLETES
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
              运动员档案
            </h1>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="text-[var(--text-muted)]">加载中...</div>
            ) : athletes.length === 0 ? (
              <div className="p-12 border border-dashed border-[var(--line-strong)] text-center">
                <User className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-muted)] mb-4">还没有运动员档案</p>
                <Link
                  href="/analysis/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-bold"
                >
                  <Plus className="w-4 h-4" />
                  创建第一个分析
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {athletes.map((athlete) => (
                  <AthleteCard 
                    key={athlete.id} 
                    athlete={athlete} 
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function AthleteCard({ 
  athlete, 
  onDelete 
}: { 
  athlete: AthleteProfile
  onDelete: (id: string) => void
}) {
  const stats = getAthleteStats(athlete.id)
  
  return (
    <div className="group panel">
      <Link href={`/athletes/${athlete.id}`}>
        <div className="p-5">
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
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--line-default)]">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
                  报告
                </div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {stats.totalReports}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
                  平均
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  stats.averageScore >= 70 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                )}>
                  {stats.averageScore}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-muted)]">
                  最高
                </div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {stats.bestScore}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--text-muted)] pt-4 border-t border-[var(--line-default)]">
              暂无分析报告
            </div>
          )}
        </div>
      </Link>
      
      {/* 操作按钮 */}
      <div className="px-5 pb-4">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(athlete.id)
          }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--negative)] transition-sharp"
        >
          删除
        </button>
      </div>
    </div>
  )
}
