"use client"

import { cn } from "@/lib/utils"
import { 
  generatePrescriptionSummary, 
  generateFeedbackSummary,
  generateExecutionAdvice,
  PrescriptionEffectSummary 
} from "@/lib/prescription-feedback"
import { Check, X, Minus, TrendingUp, AlertCircle } from "lucide-react"

interface PrescriptionHistoryProps {
  prescriptionId: string
  title: string
  athleteId: string
}

export function PrescriptionHistory({ prescriptionId, title, athleteId }: PrescriptionHistoryProps) {
  const summary = generatePrescriptionSummary(prescriptionId, athleteId)
  
  if (!summary) return null
  
  const advice = generateExecutionAdvice(prescriptionId, athleteId)
  
  return (
    <div className="mt-4 p-4 border border-[var(--line-default)] bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-[var(--text-muted)]">历史执行记录</div>
        <ExecutionBadge status={summary.lastFeedback?.executionStatus} />
      </div>
      
      {/* 执行统计 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatItem 
          label="执行率" 
          value={`${Math.round(((summary.completedCount + summary.partialCount) / summary.totalAssigned) * 100)}%`}
        />
        <StatItem 
          label="有效率" 
          value={`${summary.effectivenessRate}%`}
          highlight={summary.effectivenessRate >= 70}
        />
        <StatItem 
          label="执行次数" 
          value={`${summary.totalAssigned}`}
        />
      </div>
      
      {/* 趋势 */}
      {summary.trend !== "insufficient_data" && (
        <div className="flex items-center gap-2 text-xs mb-3">
          <TrendIndicator trend={summary.trend} />
        </div>
      )}
      
      {/* 执行建议 */}
      {advice && (
        <div className="flex items-start gap-2 text-xs text-[var(--accent)]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{advice}</span>
        </div>
      )}
    </div>
  )
}

// 执行状态标签
function ExecutionBadge({ status }: { status?: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    completed: { 
      icon: <Check className="w-3 h-3" />, 
      label: "已执行", 
      color: "text-[var(--accent)] border-[var(--accent)]" 
    },
    partial: { 
      icon: <Minus className="w-3 h-3" />, 
      label: "部分执行", 
      color: "text-[var(--warning)] border-[var(--warning)]" 
    },
    not_done: { 
      icon: <X className="w-3 h-3" />, 
      label: "未执行", 
      color: "text-[var(--text-muted)] border-[var(--text-muted)]" 
    },
  }
  
  const c = config[status || "not_done"]
  
  return (
    <span className={cn("flex items-center gap-1 px-2 py-0.5 text-[10px] border", c.color)}>
      {c.icon}
      {c.label}
    </span>
  )
}

// 统计项
function StatItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={cn("text-lg font-bold", highlight ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
        {value}
      </div>
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
    </div>
  )
}

// 趋势指示器
function TrendIndicator({ trend }: { trend: PrescriptionEffectSummary["trend"] }) {
  const config = {
    improving: { icon: <TrendingUp className="w-3 h-3" />, text: "持续改善中", color: "text-[var(--accent)]" },
    stable: { icon: <Minus className="w-3 h-3" />, text: "效果稳定", color: "text-[var(--text-muted)]" },
    declining: { icon: <TrendingUp className="w-3 h-3 rotate-180" />, text: "近期效果回落", color: "text-[var(--negative)]" },
    insufficient_data: { icon: null, text: "", color: "" },
  }
  
  const c = config[trend]
  if (!c.text) return null
  
  return (
    <span className={cn("flex items-center gap-1", c.color)}>
      {c.icon}
      {c.text}
    </span>
  )
}

// 简版反馈提示（用于处方卡片）
export function PrescriptionFeedbackHint({ prescriptionId, athleteId }: { prescriptionId: string; athleteId: string }) {
  const summaryText = generateFeedbackSummary(prescriptionId, athleteId)
  
  if (!summaryText) return null
  
  return (
    <div className="mt-3 pt-3 border-t border-[var(--line-default)] text-xs text-[var(--text-muted)]">
      {summaryText}
    </div>
  )
}
