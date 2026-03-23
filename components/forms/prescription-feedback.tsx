"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PrescriptionFeedback, saveFeedback } from "@/lib/prescription-feedback"
import { Check, X, Minus, TrendingUp, TrendingDown, Minus as MinusIcon } from "lucide-react"

interface PrescriptionFeedbackFormProps {
  pendingFeedbacks: PrescriptionFeedback[]
  athleteId: string
  onComplete: () => void
}

export function PrescriptionFeedbackForm({ 
  pendingFeedbacks, 
  athleteId,
  onComplete 
}: PrescriptionFeedbackFormProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, {
    executionStatus: PrescriptionFeedback["executionStatus"]
    perceivedEffect: PrescriptionFeedback["perceivedEffect"]
    note: string
  }>>({})
  
  if (pendingFeedbacks.length === 0) {
    onComplete()
    return null
  }
  
  const current = pendingFeedbacks[currentIndex]
  const isLast = currentIndex === pendingFeedbacks.length - 1
  
  const handleSave = () => {
    const response = responses[current.id]
    if (!response) return
    
    const feedback: PrescriptionFeedback = {
      ...current,
      executionStatus: response.executionStatus,
      perceivedEffect: response.perceivedEffect,
      executionNote: response.note,
      recordedAt: new Date().toISOString(),
    }
    
    saveFeedback(feedback)
    
    if (isLast) {
      onComplete()
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }
  
  const handleSkip = () => {
    if (isLast) {
      onComplete()
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }
  
  const currentResponse = responses[current.id] || {
    executionStatus: "not_done",
    perceivedEffect: "uncertain",
    note: "",
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--bg-secondary)] w-full max-w-lg">
        {/* 头部 */}
        <div className="p-6 border-b border-[var(--line-default)]">
          <div className="text-[10px] tracking-[0.2em] text-[var(--accent)] uppercase mb-2">
            处方执行回访 {currentIndex + 1}/{pendingFeedbacks.length}
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            上次建议练了吗？
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            帮助你追踪训练效果，让建议越来越准
          </p>
        </div>
        
        {/* 处方信息 */}
        <div className="p-6 border-b border-[var(--line-default)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[var(--accent)]">{current.category}</span>
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            {current.prescriptionTitle}
          </h3>
        </div>
        
        {/* 执行情况 */}
        <div className="p-6 space-y-6">
          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-3">
              执行情况
            </label>
            <div className="grid grid-cols-3 gap-2">
              <ExecutionButton
                selected={currentResponse.executionStatus === "completed"}
                onClick={() => setResponses({
                  ...responses,
                  [current.id]: { ...currentResponse, executionStatus: "completed" }
                })}
                icon={<Check className="w-5 h-5" />}
                label="已完成"
              />
              <ExecutionButton
                selected={currentResponse.executionStatus === "partial"}
                onClick={() => setResponses({
                  ...responses,
                  [current.id]: { ...currentResponse, executionStatus: "partial" }
                })}
                icon={<Minus className="w-5 h-5" />}
                label="部分完成"
              />
              <ExecutionButton
                selected={currentResponse.executionStatus === "not_done"}
                onClick={() => setResponses({
                  ...responses,
                  [current.id]: { ...currentResponse, executionStatus: "not_done" }
                })}
                icon={<X className="w-5 h-5" />}
                label="未执行"
              />
            </div>
          </div>
          
          {/* 执行效果（仅在完成时显示） */}
          {(currentResponse.executionStatus === "completed" || currentResponse.executionStatus === "partial") && (
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-3">
                自我感受
              </label>
              <div className="grid grid-cols-3 gap-2">
                <EffectButton
                  selected={currentResponse.perceivedEffect === "improved"}
                  onClick={() => setResponses({
                    ...responses,
                    [current.id]: { ...currentResponse, perceivedEffect: "improved" }
                  })}
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="有改善"
                  color="positive"
                />
                <EffectButton
                  selected={currentResponse.perceivedEffect === "no_change"}
                  onClick={() => setResponses({
                    ...responses,
                    [current.id]: { ...currentResponse, perceivedEffect: "no_change" }
                  })}
                  icon={<MinusIcon className="w-5 h-5" />}
                  label="无明显变化"
                  color="neutral"
                />
                <EffectButton
                  selected={currentResponse.perceivedEffect === "worsened"}
                  onClick={() => setResponses({
                    ...responses,
                    [current.id]: { ...currentResponse, perceivedEffect: "worsened" }
                  })}
                  icon={<TrendingDown className="w-5 h-5" />}
                  label="更差"
                  color="negative"
                />
              </div>
            </div>
          )}
          
          {/* 备注 */}
          <div>
            <label className="text-sm text-[var(--text-secondary)] block mb-2">
              备注（可选）
            </label>
            <textarea
              value={currentResponse.note}
              onChange={(e) => setResponses({
                ...responses,
                [current.id]: { ...currentResponse, note: e.target.value }
              })}
              placeholder="有什么想记录的吗？"
              className="w-full bg-[var(--bg-primary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
        
        {/* 按钮 */}
        <div className="p-6 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 border border-[var(--line-default)] text-[var(--text-muted)] hover:border-[var(--line-strong)]"
          >
            跳过
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-bold"
          >
            {isLast ? "完成" : "下一条"}
          </button>
        </div>
      </div>
    </div>
  )
}

// 执行按钮
function ExecutionButton({ 
  selected, 
  onClick, 
  icon, 
  label 
}: { 
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 border transition-sharp",
        selected 
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" 
          : "border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--line-strong)]"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  )
}

// 效果按钮
function EffectButton({ 
  selected, 
  onClick, 
  icon, 
  label,
  color
}: { 
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  color: "positive" | "neutral" | "negative"
}) {
  const colorClasses = {
    positive: selected ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "",
    neutral: selected ? "border-[var(--text-muted)] bg-[var(--text-muted)]/10 text-[var(--text-muted)]" : "",
    negative: selected ? "border-[var(--negative)] bg-[var(--negative)]/10 text-[var(--negative)]" : "",
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 border transition-sharp",
        selected 
          ? colorClasses[color]
          : "border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--line-strong)]"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  )
}
