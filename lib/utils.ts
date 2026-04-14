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

/**
 * 计算两个向量的余弦相似度
 */
export function cosinesim(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length")
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  if (normA === 0 || normB === 0) {
    return 0
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 计算平均值
 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((sum, val) => sum + val, 0) / arr.length
}

/**
 * 计算标准差
 */
export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0
  const avg = mean(arr)
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (arr.length - 1)
  return Math.sqrt(variance)
}
