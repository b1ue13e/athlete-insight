"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, TrendingUp, Award, Target, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReportData } from "@/lib/report-engine"
import { generateAthleteBaseline, generateBaselineInsights, generateComparisonStatements, AthleteBaseline } from "@/lib/athlete-baseline"
import { generatePrescriptions } from "@/lib/training-prescription"

export function ReportV2PageClient({ id }: { id: string }) {
  const router = useRouter()
  const [report, setReport] = useState<ReportData | null>(null)
  const [baseline, setBaseline] = useState<AthleteBaseline | null>(null)
  const [insights, setInsights] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(`report_${id}`)
    
    if (stored) {
      const parsed = JSON.parse(stored)
      setReport(parsed)
      const bl = generateAthleteBaseline(parsed.athleteId, parsed.athleteName, parsed)
      setBaseline(bl)
      setInsights(generateBaselineInsights(bl, parsed))
    }
    setIsLoading(false)
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
        <div className="text-[#7C7E84]">加载中...</div>
      </div>
    )
  }

  if (!report || !baseline) {
    return (
      <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#7C7E84] mb-4">报告不存在</div>
          <Link href="/history" className="text-[#CCFF00]">返回历史记录</Link>
        </div>
      </div>
    )
  }

  const comparisons = generateComparisonStatements(baseline, report)
  const prescriptions = generatePrescriptions(report)

  return (
    <div className="min-h-screen bg-[#0B0D12]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/history" className="p-2 -ml-2 rounded-full hover:bg-white/5">
            <ArrowLeft className="w-6 h-6 text-[#7C7E84]" />
          </Link>
          <h1 className="text-xl font-bold text-[#F0F2F5]">{report.athleteName} - 深度分析</h1>
        </div>

        {/* Baseline Card */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-[#CCFF00]" />
            <h3 className="font-bold text-[#F0F2F5]">个人基线对比</h3>
          </div>
          <div className="space-y-3">
            {comparisons.map((comp, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                <span className="text-[#7C7E84] text-sm">{comp.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#F0F2F5] font-bold">{comp.current}</span>
                  <span className={`text-sm ${comp.trend === 'up' ? 'text-[#CCFF00]' : comp.trend === 'down' ? 'text-[#FF6B6B]' : 'text-[#7C7E84]'}`}>
                    {comp.trend === 'up' ? '↑' : comp.trend === 'down' ? '↓' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-5 h-5 text-[#CCFF00]" />
            <h3 className="font-bold text-[#F0F2F5]">智能洞察</h3>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#CCFF00] mt-1">•</span>
                <p className="text-[#F0F2F5] text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prescriptions */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-[#CCFF00]" />
            <h3 className="font-bold text-[#F0F2F5]">训练处方</h3>
          </div>
          <div className="space-y-3">
            {prescriptions.map((pres, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4">
                <div className="font-bold text-[#F0F2F5] mb-1">{pres.focus}</div>
                <div className="text-sm text-[#7C7E84] mb-2">{pres.target}</div>
                <div className="text-sm text-[#CCFF00]">{pres.recommendation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Share */}
        <button
          onClick={() => {
            const text = `${report.athleteName} 深度表现分析 - ${report.overallPerformance.score}分`
            if (navigator.share) {
              navigator.share({ title: `${report.athleteName} - 分析报告`, text })
            } else {
              navigator.clipboard.writeText(text)
              alert("已复制到剪贴板")
            }
          }}
          className="w-full py-4 bg-[#CCFF00] text-[#0B0D12] rounded-2xl font-bold flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          分享报告
        </button>
      </div>
    </div>
  )
}
