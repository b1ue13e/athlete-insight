"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Check, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * AI 处方卡片 - 医疗处方风格
 * 
 * 核心视觉：
 * - 打印小票/医疗处方风格
 * - 等宽字体展示统计数据
 * - Accordion折叠面板
 * - 复选框形式的训练动作列表
 */

export interface PrescriptionItem {
  id: string
  category: "aerobic_base" | "lactate_threshold" | "strength" | "mobility" | "recovery"
  name: string
  description: string
  sets: string
  frequency: string
  purpose: string
  evidence?: string  // 触发该处方的统计数据
}

interface PrescriptionTicketProps {
  diagnosis: string
  rootCause: string
  prescriptions: PrescriptionItem[]
  riskWarning?: string
  raceReadiness: "ready" | "close" | "not_ready" | "risky"
  timeline: string
  className?: string
}

const categoryConfig = {
  aerobic_base: { label: "有氧基础", color: "text-cyan-400", bg: "bg-cyan-950/30" },
  lactate_threshold: { label: "乳酸阈值", color: "text-amber-400", bg: "bg-amber-950/30" },
  strength: { label: "力量训练", color: "text-rose-400", bg: "bg-rose-950/30" },
  mobility: { label: "柔韧性", color: "text-emerald-400", bg: "bg-emerald-950/30" },
  recovery: { label: "恢复", color: "text-purple-400", bg: "bg-purple-950/30" }
}

const readinessConfig = {
  ready: { label: "已就绪", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  close: { label: "接近就绪", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  not_ready: { label: "未就绪", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30" },
  risky: { label: "高风险", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" }
}

export function PrescriptionTicket({
  diagnosis,
  rootCause,
  prescriptions,
  riskWarning,
  raceReadiness,
  timeline,
  className
}: PrescriptionTicketProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("diagnosis")
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set())

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const toggleItem = (id: string) => {
    const newCompleted = new Set(completedItems)
    if (newCompleted.has(id)) {
      newCompleted.delete(id)
    } else {
      newCompleted.add(id)
    }
    setCompletedItems(newCompleted)
  }

  const readiness = readinessConfig[raceReadiness]

  return (
    <div className={cn(
      "bg-slate-950 border-2 border-slate-800 font-mono",
      className
    )}>
      {/* 票头 */}
      <div className="border-b-2 border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              ATHLETE INSIGHT // PRESCRIPTION TICKET
            </div>
            <div className="text-lg font-bold text-white mt-1">
              AI 运动处方
            </div>
          </div>
          <div className={cn(
            "px-3 py-1 border",
            readiness.bg,
            readiness.border,
            readiness.color
          )}>
            <span className="text-xs font-bold uppercase">
              {readiness.label}
            </span>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          ID: RX-{Date.now().toString(36).toUpperCase().slice(-8)}
        </div>
      </div>

      {/* 诊断折叠面板 */}
      <div className="border-b border-slate-800">
        <button
          onClick={() => toggleSection("diagnosis")}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🔬</span>
            <span className="font-bold text-white">诊断结论</span>
          </div>
          {expandedSection === "diagnosis" ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {expandedSection === "diagnosis" && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-white font-medium leading-relaxed">
              {diagnosis}
            </p>
            <div className="p-3 bg-slate-900 border-l-2 border-slate-600">
              <div className="text-xs text-slate-500 uppercase mb-1">根本原因分析</div>
              <p className="text-sm text-slate-400">{rootCause}</p>
            </div>
          </div>
        )}
      </div>

      {/* 风险警告 */}
      {riskWarning && (
        <div className="border-b border-slate-800">
          <button
            onClick={() => toggleSection("risk")}
            className="w-full flex items-center justify-between p-4 bg-red-950/20 hover:bg-red-950/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="font-bold text-red-400">风险警告</span>
            </div>
            {expandedSection === "risk" ? (
              <ChevronUp className="w-5 h-5 text-red-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-red-500" />
            )}
          </button>
          
          {expandedSection === "risk" && (
            <div className="px-4 pb-4">
              <p className="text-red-400 text-sm leading-relaxed">
                {riskWarning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 训练处方 */}
      <div className="border-b border-slate-800">
        <button
          onClick={() => toggleSection("prescriptions")}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">💊</span>
            <span className="font-bold text-white">训练处方</span>
            <span className="text-xs text-slate-500">
              ({completedItems.size}/{prescriptions.length} 完成)
            </span>
          </div>
          {expandedSection === "prescriptions" ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {expandedSection === "prescriptions" && (
          <div className="px-4 pb-4 space-y-3">
            {prescriptions.map((rx) => {
              const category = categoryConfig[rx.category]
              const isCompleted = completedItems.has(rx.id)
              
              return (
                <div
                  key={rx.id}
                  className={cn(
                    "border p-3 transition-all",
                    isCompleted 
                      ? "border-slate-700 bg-slate-900/50 opacity-50" 
                      : "border-slate-700 bg-slate-900"
                  )}
                >
                  {/* 头部 */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleItem(rx.id)}
                      className={cn(
                        "w-5 h-5 border flex items-center justify-center mt-0.5 transition-colors",
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-slate-600 hover:border-slate-500"
                      )}
                    >
                      {isCompleted && <Check className="w-3 h-3 text-white" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs px-1.5 py-0.5", category.bg, category.color)}>
                          {category.label}
                        </span>
                        <span className="font-bold text-white">{rx.name}</span>
                      </div>
                      
                      <p className="text-sm text-slate-400 mb-2">{rx.description}</p>
                      
                      {/* 统计数据证据 */}
                      {rx.evidence && (
                        <div className="text-xs font-mono text-amber-400 mb-2 bg-amber-950/20 p-1.5">
                          EVIDENCE: {rx.evidence}
                        </div>
                      )}
                      
                      {/* 执行参数 */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-slate-500">
                          计划: <span className="text-slate-300">{rx.sets}</span>
                        </div>
                        <div className="text-slate-500">
                          频率: <span className="text-slate-300">{rx.frequency}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-slate-500">
                        目的: <span className="text-slate-400">{rx.purpose}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 时间线 */}
      <div className="p-4">
        <div className="text-xs text-slate-500 uppercase mb-2">改善时间线</div>
        <p className="text-sm text-slate-300">{timeline}</p>
      </div>

      {/* 票脚 */}
      <div className="border-t-2 border-slate-800 p-4 bg-slate-900/30">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>GENERATED BY ATHLETE INSIGHT AI</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-700 uppercase tracking-wider">
          THIS PRESCRIPTION IS BASED ON STATISTICAL ANALYSIS OF YOUR BIOMETRIC DATA.
          CONSULT A PROFESSIONAL COACH BEFORE MAKING SIGNIFICANT TRAINING CHANGES.
        </div>
      </div>
    </div>
  )
}
