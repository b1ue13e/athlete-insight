import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })
}

export function getScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500"
  if (score >= 70) return "text-amber-500"
  if (score >= 60) return "text-orange-500"
  return "text-red-500"
}

export function getScoreBgColor(score: number): string {
  if (score >= 85) return "bg-emerald-500"
  if (score >= 70) return "bg-amber-500"
  if (score >= 60) return "bg-orange-500"
  return "bg-red-500"
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "优秀表现"
  if (score >= 80) return "良好表现"
  if (score >= 70) return "中上表现"
  if (score >= 60) return "及格表现"
  if (score >= 50) return "需改进"
  return "问题明显"
}

export function generateId(): string {
  return crypto.randomUUID()
}
