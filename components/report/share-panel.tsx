"use client"

import { useState, useRef } from "react"
import { toPng } from "html-to-image"
import { cn } from "@/lib/utils"
import { 
  Share2, 
  Copy, 
  Download, 
  Check, 
  X,
  FileText,
  Image as ImageIcon,
  MessageSquare
} from "lucide-react"
import { ReportData } from "@/lib/report-engine"
import { AthleteBaseline } from "@/lib/athlete-baseline"
import { 
  generateCoachSummary, 
  formatCoachSummaryText,
  generateShareCardData,
  generatePDFData,
  copyToClipboard,
  downloadTextFile,
  generateSocialCaption
} from "@/lib/share-formats"

interface SharePanelProps {
  report: ReportData
  baseline?: AthleteBaseline
  insights: string[]
}

export function SharePanel({ report, baseline, insights }: SharePanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  
  const coachSummary = generateCoachSummary(report, baseline)
  const cardData = generateShareCardData(report, baseline)
  const pdfData = generatePDFData(report, insights, baseline)
  
  const handleCopy = async (type: string, text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    }
  }
  
  const handleDownloadCard = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95 })
      const link = document.createElement("a")
      link.download = `${report.athleteName}_${report.matchName}_报告卡片.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Failed to generate image:", err)
    }
  }
  
  const handleDownloadPDF = () => {
    // 简版：先导出文本，后续可用 jsPDF 生成真正 PDF
    const content = formatPDFContent(pdfData)
    downloadTextFile(`${report.athleteName}_${report.matchName}_报告.txt`, content)
  }
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent)] text-[var(--bg-primary)] rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-sharp z-50"
      >
        <Share2 className="w-6 h-6" />
      </button>
    )
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--bg-secondary)] w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--line-default)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">分享报告</h2>
          <button onClick={() => setIsOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* 1. 教练版摘要 */}
          <section>
            <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
              <MessageSquare className="w-4 h-4" />
              <h3 className="font-medium">教练版摘要</h3>
              <span className="text-xs text-[var(--text-muted)]">极简，一屏内</span>
            </div>
            
            <div className="p-4 border border-[var(--line-default)] bg-[var(--bg-tertiary)] font-mono text-sm whitespace-pre-wrap text-[var(--text-secondary)]">
              {formatCoachSummaryText(coachSummary)}
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleCopy("coach", formatCoachSummaryText(coachSummary))}
                className="flex-1 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-medium flex items-center justify-center gap-2"
              >
                {copied === "coach" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === "coach" ? "已复制" : "复制文本"}
              </button>
            </div>
          </section>
          
          {/* 2. 图片卡片 */}
          <section>
            <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
              <ImageIcon className="w-4 h-4" />
              <h3 className="font-medium">分享卡片</h3>
              <span className="text-xs text-[var(--text-muted)]">适合社交媒体</span>
            </div>
            
            {/* 卡片预览 */}
            <div 
              ref={cardRef}
              className="p-8 bg-[var(--bg-primary)] border-2 border-[var(--accent)]"
              style={{ aspectRatio: "1/1" }}
            >
              <div className="h-full flex flex-col">
                {/* 品牌 */}
                <div className="text-[10px] tracking-[0.3em] text-[var(--accent)]">{cardData.brand}</div>
                
                {/* 主体 */}
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <div className="text-[96px] font-bold text-[var(--accent)] leading-none">{cardData.score}</div>
                  <div className="text-xl text-[var(--text-primary)] mt-4">{cardData.oneLiner}</div>
                </div>
                
                {/* 信息 */}
                <div className="space-y-2 text-center">
                  <div className="text-[var(--text-primary)]">{cardData.athleteName} · {cardData.position}</div>
                  <div className="text-sm text-[var(--text-muted)]">{cardData.matchName}</div>
                  <div className="pt-4 border-t border-[var(--line-default)]">
                    <div className="text-xs text-[var(--text-secondary)]">核心问题</div>
                    <div className="text-sm text-[var(--text-primary)] mt-1">{cardData.primaryWeakness}</div>
                  </div>
                  <div className="pt-2">
                    <div className="text-xs text-[var(--accent)]">训练动作</div>
                    <div className="text-sm text-[var(--text-primary)] mt-1">{cardData.primaryPrescription}</div>
                  </div>
                </div>
                
                {/* 日期 */}
                <div className="text-[10px] text-[var(--text-muted)] text-center mt-4">{cardData.date}</div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDownloadCard}
                className="flex-1 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载图片
              </button>
              <button
                onClick={() => handleCopy("social", generateSocialCaption(cardData))}
                className="flex-1 py-2 border border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {copied === "social" ? "已复制" : "复制文案"}
              </button>
            </div>
          </section>
          
          {/* 3. PDF 简版 */}
          <section>
            <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
              <FileText className="w-4 h-4" />
              <h3 className="font-medium">完整报告</h3>
              <span className="text-xs text-[var(--text-muted)]">存档用</span>
            </div>
            
            <div className="p-4 border border-[var(--line-default)]">
              <div className="text-sm text-[var(--text-secondary)]">
                <div className="flex justify-between mb-2">
                  <span>运动员</span>
                  <span className="text-[var(--text-primary)]">{pdfData.meta.athleteName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>比赛</span>
                  <span className="text-[var(--text-primary)]">{pdfData.meta.matchName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>综合评分</span>
                  <span className="text-[var(--accent)]">{pdfData.overview.score}</span>
                </div>
                <div className="flex justify-between">
                  <span>数据可信度</span>
                  <span className="text-[var(--text-primary)]">{pdfData.dataQuality.level}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDownloadPDF}
              className="w-full mt-3 py-2 border border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载报告 (TXT)
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}

// 格式化 PDF 文本内容
function formatPDFContent(data: ReturnType<typeof generatePDFData>): string {
  const lines: string[] = []
  
  lines.push("=".repeat(40))
  lines.push("ATHLETE INSIGHT 分析报告")
  lines.push("=".repeat(40))
  lines.push(``)
  lines.push(`运动员：${data.meta.athleteName}`)
  lines.push(`位置：${data.meta.position}`)
  lines.push(`比赛：${data.meta.matchName}`)
  lines.push(`日期：${data.meta.date}`)
  lines.push(``)
  lines.push("-".repeat(40))
  lines.push("综合评估")
  lines.push("-".repeat(40))
  lines.push(`评分：${data.overview.score}`)
  lines.push(`结论：${data.overview.verdict}`)
  lines.push(``)
  lines.push("-".repeat(40))
  lines.push("维度得分")
  lines.push("-".repeat(40))
  data.subScores.forEach(s => {
    lines.push(`${s.label}：${s.score}`)
  })
  lines.push(``)
  lines.push("-".repeat(40))
  lines.push("关键洞察")
  lines.push("-".repeat(40))
  data.insights.forEach(i => lines.push(`• ${i}`))
  lines.push(``)
  lines.push("-".repeat(40))
  lines.push("优势")
  lines.push("-".repeat(40))
  data.strengths.forEach(s => lines.push(`+ ${s}`))
  lines.push(``)
  lines.push("-".repeat(40))
  lines.push("需改进")
  lines.push("-".repeat(40))
  data.weaknesses.forEach(w => lines.push(`- ${w}`))
  lines.push(``)
  lines.push("-".repeat(40))
  lines.push("训练处方")
  lines.push("-".repeat(40))
  data.prescriptions.forEach((p, i) => {
    lines.push(`${i + 1}. [${p.category}] ${p.title}`)
    lines.push(`   ${p.execution}`)
    lines.push(`   达标：${p.target}`)
    lines.push(``)
  })
  lines.push("-".repeat(40))
  lines.push("数据说明")
  lines.push("-".repeat(40))
  lines.push(`可信度：${data.dataQuality.level}（${data.dataQuality.source}）`)
  lines.push(data.dataQuality.note)
  lines.push(``)
  lines.push("=".repeat(40))
  lines.push(`生成时间：${data.meta.generatedAt}`)
  lines.push("=".repeat(40))
  
  return lines.join("\n")
}
