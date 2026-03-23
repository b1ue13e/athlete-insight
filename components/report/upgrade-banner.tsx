"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ReportUpgradeDiff } from "@/lib/report-diff"
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Sparkles } from "lucide-react"

interface UpgradeBannerProps {
  diff: ReportUpgradeDiff
  className?: string
}

export function UpgradeBanner({ diff, className }: UpgradeBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const hasSignificantChange = 
    diff.dataCompleteness.change >= 20 || 
    Math.abs(diff.scoreChange.overall.change) >= 3
  
  return (
    <div className={cn(
      "border-l-4",
      hasSignificantChange ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--info)] bg-[var(--info)]/5",
      className
    )}>
      {/* 头部摘要 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 flex items-center justify-center",
            hasSignificantChange ? "bg-[var(--accent)] text-[var(--bg-primary)]" : "bg-[var(--info)] text-[var(--bg-primary)]"
          )}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="font-medium text-[var(--text-primary)]">
              {diff.summary}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              可信度 {diff.confidenceLevel.fromLabel} → {diff.confidenceLevel.toLabel}
              {diff.scoreChange.overall.change !== 0 && (
                <span className={cn(
                  "ml-2",
                  diff.scoreChange.overall.change > 0 ? "text-[var(--accent)]" : "text-[var(--negative)]"
                )}>
                  评分 {diff.scoreChange.overall.change > 0 ? "+" : ""}{diff.scoreChange.overall.change}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-[var(--text-muted)]">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      
      {/* 展开详情 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 数据完整度进度条 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[var(--text-muted)]">数据完整度</span>
              <span className="text-[var(--text-primary)]">
                {diff.dataCompleteness.from}% → {diff.dataCompleteness.to}%
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-tertiary)] relative">
              <div 
                className="absolute h-full bg-[var(--text-muted)] transition-all"
                style={{ width: `${diff.dataCompleteness.from}%` }}
              />
              <div 
                className="absolute h-full bg-[var(--accent)] transition-all"
                style={{ 
                  left: `${diff.dataCompleteness.from}%`,
                  width: `${diff.dataCompleteness.change}%` 
                }}
              />
            </div>
          </div>
          
          {/* 维度变化 */}
          {diff.scoreChange.dimensions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--text-muted)]">维度评分变化</div>
              {diff.scoreChange.dimensions.map((dim) => (
                <DimensionChangeRow key={dim.dimension} dim={dim} />
              ))}
            </div>
          )}
          
          {/* 新增判断 */}
          {diff.newInsights.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--text-muted)]">新增精确判断</div>
              <div className="grid gap-2">
                {diff.newInsights.map((insight, i) => (
                  <div key={i} className="p-2 bg-[var(--bg-secondary)] border border-[var(--line-default)]">
                    <div className="text-xs font-medium text-[var(--accent)]">{insight.category}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{insight.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 补充的字段 */}
          {diff.addedFields.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--text-muted)]">补充的数据项</div>
              <div className="flex flex-wrap gap-2">
                {diff.addedFields.map((field) => (
                  <span
                    key={field.fieldId}
                    className={cn(
                      "px-2 py-1 text-xs border",
                      field.importance === "high" 
                        ? "border-[var(--accent)] text-[var(--accent)]" 
                        : "border-[var(--line-default)] text-[var(--text-secondary)]"
                    )}
                    title={field.impact}
                  >
                    {field.fieldName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 维度变化行
function DimensionChangeRow({ dim }: { dim: ReportUpgradeDiff["scoreChange"]["dimensions"][0] }) {
  const Icon = dim.change > 0 ? TrendingUp : dim.change < 0 ? TrendingDown : Minus
  const colorClass = dim.change > 0 ? "text-[var(--accent)]" : dim.change < 0 ? "text-[var(--negative)]" : "text-[var(--text-muted)]"
  
  return (
    <div className="flex items-center justify-between p-2 bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", colorClass)} />
        <span className="text-sm text-[var(--text-primary)]">{dim.label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-[var(--text-primary)]">
          {dim.from} → {dim.to}
          <span className={cn("ml-2 text-xs", colorClass)}>
            {dim.change > 0 ? "+" : ""}{dim.change}
          </span>
        </div>
        {dim.reason && (
          <div className="text-xs text-[var(--text-muted)]">{dim.reason}</div>
        )}
      </div>
    </div>
  )
}
