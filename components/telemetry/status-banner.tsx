"use client"

import { cn } from "@/lib/utils"

/**
 * Status Banner Component
 */

export type EngineStatus = "stable" | "warning" | "critical" | "unknown"

interface StatusBannerProps {
  status: EngineStatus
  title: string
  subtitle: string
  metrics: {
    label: string
    value: string
    trend?: "up" | "down" | "neutral"
  }[]
  oneLiner: string
  className?: string
}

const statusConfig = {
  stable: {
    bg: "bg-emerald-950/30",
    border: "border-emerald-500/50",
    accent: "bg-emerald-500",
    text: "text-emerald-400",
    icon: "🟢",
    label: "引擎运转稳定"
  },
  warning: {
    bg: "bg-amber-950/30",
    border: "border-amber-500/50",
    accent: "bg-amber-500",
    text: "text-amber-400",
    icon: "🟡",
    label: "系统告警"
  },
  critical: {
    bg: "bg-red-950/30",
    border: "border-red-500/50",
    accent: "bg-red-500",
    text: "text-red-400",
    icon: "🔴",
    label: "高危状态"
  },
  unknown: {
    bg: "bg-slate-950/30",
    border: "border-slate-500/50",
    accent: "bg-slate-500",
    text: "text-slate-400",
    icon: "⚪",
    label: "数据不足"
  }
}

export function StatusBanner({
  status,
  title,
  subtitle,
  metrics,
  oneLiner,
  className
}: StatusBannerProps) {
  const config = statusConfig[status]

  return (
    <div className={cn(
      "relative border-2 p-6",
      config.bg,
      config.border,
      className
    )}>
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        config.accent
      )} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <div className={cn(
              "text-xs font-mono uppercase tracking-wider",
              config.text
            )}>
              {config.label}
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              {title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          {metrics.map((m, i) => (
            <div key={i} className="text-right">
              <div className="text-xs text-slate-500 font-mono uppercase">
                {m.label}
              </div>
              <div className={cn(
                "text-xl font-bold font-mono mt-1",
                m.trend === "up" ? "text-red-400" :
                m.trend === "down" ? "text-emerald-400" :
                "text-white"
              )}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <p className="text-lg font-medium italic text-slate-300">
          &quot;{oneLiner}&quot;
        </p>
      </div>
    </div>
  )
}
