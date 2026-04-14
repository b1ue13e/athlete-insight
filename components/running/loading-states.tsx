"use client"

import { cn } from "@/lib/utils"

interface AnalyzingStateProps {
  step?: "parsing" | "calculating" | "detecting" | "saving"
  progress?: number
}

export function AnalyzingState({ step = "calculating", progress }: AnalyzingStateProps) {
  const steps = {
    parsing: "解析训练数据...",
    calculating: "计算四维评分...",
    detecting: "识别训练偏差...",
    saving: "保存分析结果...",
  }

  const stepOrder = ["parsing", "calculating", "detecting", "saving"]
  const currentIndex = stepOrder.indexOf(step)

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* 动画圆圈 */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div 
          className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ animationDuration: '1s' }}
        />
        {/* 内部脉冲 */}
        <div className="absolute inset-4 rounded-full bg-primary/20 animate-pulse" />
      </div>

      {/* 步骤指示器 */}
      <div className="flex gap-2 mb-4">
        {stepOrder.map((s, i) => (
          <div
            key={s}
            className={cn(
              "w-2 h-2 rounded-full transition-colors duration-300",
              i <= currentIndex ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* 当前步骤文字 */}
      <p className="text-lg font-medium animate-pulse">
        {steps[step]}
      </p>

      {/* 进度条（可选） */}
      {progress !== undefined && (
        <div className="w-48 h-1 bg-muted rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

interface ScoreRingProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function ScoreRing({ score, size = "md", showLabel = true }: ScoreRingProps) {
  const sizes = {
    sm: { container: "w-16 h-16", text: "text-xl", ring: "w-20 h-20" },
    md: { container: "w-24 h-24", text: "text-3xl", ring: "w-28 h-28" },
    lg: { container: "w-32 h-32", text: "text-4xl", ring: "w-36 h-36" },
  }

  const circumference = 2 * Math.PI * 45 // r=45
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 stroke-emerald-500"
    if (score >= 60) return "text-yellow-500 stroke-yellow-500"
    return "text-red-500 stroke-red-500"
  }

  return (
    <div className={cn("relative flex items-center justify-center", sizes[size].ring)}>
      {/* 背景圆环 */}
      <svg className={cn("absolute transform -rotate-90", sizes[size].container)}>
        <circle
          cx="50%"
          cy="50%"
          r="45"
          className="fill-none stroke-muted"
          strokeWidth="8"
        />
        <circle
          cx="50%"
          cy="50%"
          r="45"
          className={cn("fill-none transition-all duration-1000 ease-out", getColor(score))}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 1s ease-out",
          }}
        />
      </svg>

      {/* 分数 */}
      <div className={cn("font-bold", sizes[size].text, getColor(score).split(" ")[0])}>
        {score}
      </div>

      {/* 标签 */}
      {showLabel && (
        <div className="absolute -bottom-6 text-xs text-muted-foreground">
          {score >= 80 ? "优秀" : score >= 60 ? "良好" : "需改进"}
        </div>
      )}
    </div>
  )
}

interface DeviationBadgeProps {
  type: "major" | "moderate" | "minor"
  children: React.ReactNode
}

export function DeviationBadge({ type, children }: DeviationBadgeProps) {
  const styles = {
    major: "bg-red-500/10 border-red-500/30 text-red-600",
    moderate: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600",
    minor: "bg-blue-500/10 border-blue-500/30 text-blue-600",
  }

  const labels = {
    major: "严重",
    moderate: "中等", 
    minor: "轻微",
  }

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm", styles[type])}>
      <span className="font-medium">{labels[type]}</span>
      <span className="opacity-75">{children}</span>
    </div>
  )
}

interface DimensionBarProps {
  label: string
  score: number
  weight: string
  icon: string
  status: string
  insight: string
}

export function DimensionBar({ label, score, weight, icon, status, insight }: DimensionBarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "bg-emerald-500"
      case "good": return "bg-emerald-400"
      case "fair": return "bg-yellow-500"
      case "poor": return "bg-red-500"
      case "warning": return "bg-orange-500"
      default: return "bg-muted"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-2 p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">({weight})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-lg font-bold", getScoreColor(score))}>
            {score}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-muted">
            {status === "excellent" && "优秀"}
            {status === "good" && "良好"}
            {status === "fair" && "一般"}
            {status === "poor" && "需改进"}
            {status === "warning" && "警告"}
          </span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-700", getStatusColor(status))}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* 洞察 */}
      <p className="text-sm text-muted-foreground">{insight}</p>
    </div>
  )
}

interface ComparisonArrowProps {
  direction: "up" | "down" | "neutral"
  value: string
  label?: string
}

export function ComparisonArrow({ direction, value, label }: ComparisonArrowProps) {
  const styles = {
    up: "text-emerald-500",
    down: "text-red-500", 
    neutral: "text-muted-foreground",
  }

  const arrows = {
    up: "↑",
    down: "↓",
    neutral: "→",
  }

  return (
    <div className={cn("flex items-center gap-1 text-sm", styles[direction])}>
      <span className="font-bold">{arrows[direction]}</span>
      <span>{value}</span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </div>
  )
}
