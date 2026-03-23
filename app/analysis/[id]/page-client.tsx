"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Share2, Download, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReportData } from "@/lib/report-engine"
import { errorTagOptions } from "@/types/errors"

export function ReportPageClient({ id }: { id: string }) {
  const router = useRouter()
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(`report_${id}`)
    
    if (stored) {
      setReport(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [id])

  const handleDelete = () => {
    if (!report) return
    if (!confirm("确定要删除这份报告吗？此操作不可撤销。")) return
    
    localStorage.removeItem(`report_${id}`)
    router.push("/history")
  }

  const handleExport = () => {
    if (!report) return
    
    const dataStr = JSON.stringify(report, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `report-${report.athleteName}-${new Date(report.createdAt).toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
        <div className="text-[#7C7E84]">加载中...</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0B0D12]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/history"
              className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#7C7E84]" />
            </Link>
            <h1 className="text-xl font-bold text-[#F0F2F5]">报告详情</h1>
          </div>

          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-[#7C7E84] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#F0F2F5] mb-2">报告不存在</h2>
            <p className="text-[#7C7E84] mb-6">该报告可能已被删除或链接错误</p>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#CCFF00] text-[#0B0D12] rounded-full font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              返回历史记录
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getPerformanceEmoji = (score: number) => {
    if (score >= 90) return "🔥"
    if (score >= 80) return "👍"
    if (score >= 70) return "😐"
    if (score >= 60) return "⚠️"
    return "❌"
  }

  const getPerformanceText = (score: number) => {
    if (score >= 90) return "出色"
    if (score >= 80) return "良好"
    if (score >= 70) return "一般"
    if (score >= 60) return "需改进"
    return "不理想"
  }

  return (
    <div className="min-h-screen bg-[#0B0D12]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/history"
              className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#7C7E84]" />
            </Link>
            <h1 className="text-xl font-bold text-[#F0F2F5]">报告详情</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 rounded-full hover:bg-white/5 transition-colors"
              title="导出 JSON"
            >
              <Download className="w-5 h-5 text-[#7C7E84]" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-white/5 transition-colors"
              title="删除"
            >
              <Trash2 className="w-5 h-5 text-[#FF6B6B]" />
            </button>
          </div>
        </div>

        {/* Athlete Info */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#F0F2F5] mb-1">
                {report.athleteName}
              </h2>
              <p className="text-[#7C7E84] text-sm">
                {new Date(report.createdAt).toLocaleDateString("zh-CN")} · {report.matchName}
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#CCFF00]">
                {getPerformanceEmoji(report.overallPerformance.score)}
              </div>
              <div className="text-sm text-[#7C7E84] mt-1">
                {getPerformanceText(report.overallPerformance.score)}
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-[#7C7E84] text-sm mb-1">得分贡献</div>
            <div className="text-2xl font-bold text-[#F0F2F5]">
              {report.scoring.score}/100
            </div>
            <div className="text-xs text-[#7C7E84] mt-1">
              {report.scoring.rating}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-[#7C7E84] text-sm mb-1">失误控制</div>
            <div className="text-2xl font-bold text-[#F0F2F5]">
              {report.errors.score}/100
            </div>
            <div className="text-xs text-[#7C7E84] mt-1">
              {report.errors.rating}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-[#7C7E84] text-sm mb-1">关键分表现</div>
            <div className="text-2xl font-bold text-[#F0F2F5]">
              {report.clutch.score}/100
            </div>
            <div className="text-xs text-[#7C7E84] mt-1">
              {report.clutch.rating}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-[#7C7E84] text-sm mb-1">整体效率</div>
            <div className="text-2xl font-bold text-[#F0F2F5]">
              {report.overallPerformance.score}/100
            </div>
            <div className="text-xs text-[#7C7E84] mt-1">
              {report.overallPerformance.rating}
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-[#F0F2F5] mb-4">关键数据</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-[#7C7E84]">净得分</span>
              <span className="text-[#F0F2F5] font-bold">
                +{report.keyStats.netPoints}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-[#7C7E84]">一传到位率</span>
              <span className="text-[#F0F2F5] font-bold">
                {report.keyStats.receptionRate}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-[#7C7E84]">发球得分</span>
              <span className="text-[#F0F2F5] font-bold">
                {report.keyStats.aces} 个
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-[#7C7E84]">发球失误</span>
              <span className="text-[#F0F2F5] font-bold">
                {report.keyStats.servingErrors} 个
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-[#7C7E84]">扣球得分</span>
              <span className="text-[#F0F2F5] font-bold">
                {report.keyStats.spikingKills} 个
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-[#7C7E84]">扣球失误</span>
              <span className="text-[#F0F2F5] font-bold">
                {report.keyStats.spikingErrors} 个
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#7C7E84]">拦网得分</span>
              <span className="text-[#F0F2F5] font-bold">
                {report.keyStats.blocks} 个
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#7C7E84]">防守失误</span>
              <span className="text-[#F0F2F5] font-bold">
                {report.keyStats.defensiveErrors} 个
              </span>
            </div>
          </div>
        </div>

        {/* Observations */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-[#F0F2F5] mb-4">主要观察</h3>
          
          <div className="mb-4">
            <div className="text-[#CCFF00] text-sm font-bold mb-2">优势</div>
            <p className="text-[#F0F2F5]">{report.observations.topStrength}</p>
          </div>
          
          <div>
            <div className="text-[#FF6B6B] text-sm font-bold mb-2">需改进</div>
            <p className="text-[#F0F2F5]">{report.observations.topWeakness}</p>
          </div>
        </div>

        {/* Prescriptions */}
        {report.prescriptions && report.prescriptions.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-[#F0F2F5] mb-4">训练处方</h3>
            <div className="space-y-3">
              {report.prescriptions.map((prescription, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#CCFF00]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#CCFF00] font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-bold text-[#F0F2F5] mb-1">
                        {prescription.focus}
                      </div>
                      <div className="text-sm text-[#7C7E84] mb-2">
                        {prescription.target}
                      </div>
                      <div className="text-sm text-[#CCFF00]">
                        建议: {prescription.recommendation}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Button */}
        <button
          onClick={() => {
            const text = `${report.athleteName} ${report.matchName} 表现分析\n总体评分: ${report.overallPerformance.score}分\n${window.location.href}`
            if (navigator.share) {
              navigator.share({
                title: `${report.athleteName} - 表现分析报告`,
                text,
              })
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
