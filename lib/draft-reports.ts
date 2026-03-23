/**
 * 草稿报告管理 - 支持快录+补录闭环
 * 
 * 1. 快速录入生成初版报告
 * 2. 后续可补充精确数据升级为完整版
 */

import { ReportData } from "./report-engine"

export type ReportVersion = "draft" | "complete"

export interface DraftReport {
  id: string
  athleteId: string
  athleteName: string
  matchName: string
  version: ReportVersion
  createdAt: string
  updatedAt: string
  
  // 已填字段
  filledFields: string[]
  
  // 待补字段（用于提示用户）
  pendingFields: {
    fieldId: string
    fieldName: string
    importance: "high" | "medium" | "low"
    reason: string
  }[]
  
  // 当前报告数据
  report: ReportData
}

const DRAFT_KEY = "athlete_drafts"

// 保存草稿
export function saveDraft(draft: DraftReport): void {
  if (typeof window === "undefined") return
  
  const drafts = getAllDrafts()
  const existingIndex = drafts.findIndex(d => d.id === draft.id)
  
  if (existingIndex >= 0) {
    drafts[existingIndex] = { ...draft, updatedAt: new Date().toISOString() }
  } else {
    drafts.push(draft)
  }
  
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
}

// 获取所有草稿
export function getAllDrafts(): DraftReport[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(DRAFT_KEY)
  return stored ? JSON.parse(stored) : []
}

// 获取运动员的草稿
export function getDraftsByAthlete(athleteId: string): DraftReport[] {
  return getAllDrafts().filter(d => d.athleteId === athleteId)
}

// 获取单个草稿
export function getDraft(id: string): DraftReport | null {
  return getAllDrafts().find(d => d.id === id) || null
}

// 删除草稿
export function deleteDraft(id: string): void {
  if (typeof window === "undefined") return
  const drafts = getAllDrafts().filter(d => d.id !== id)
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
}

// 升级草稿为完整版
export function upgradeDraft(
  draftId: string, 
  additionalData: Record<string, any>
): DraftReport | null {
  const draft = getDraft(draftId)
  if (!draft) return null
  
  // 合并新数据
  const updatedReport = {
    ...draft.report,
    rawInput: { ...draft.report.rawInput, ...additionalData },
    metadata: {
      ...draft.report.metadata,
      dataCertainty: "precise" as const,
    }
  }
  
  // 计算新的待补字段
  const pendingFields = calculatePendingFields(updatedReport.rawInput)
  
  const upgraded: DraftReport = {
    ...draft,
    version: pendingFields.length === 0 ? "complete" : "draft",
    updatedAt: new Date().toISOString(),
    filledFields: [...draft.filledFields, ...Object.keys(additionalData)],
    pendingFields,
    report: updatedReport,
  }
  
  saveDraft(upgraded)
  return upgraded
}

// 计算待补字段
function calculatePendingFields(rawInput: Record<string, any>): DraftReport["pendingFields"] {
  const pending: DraftReport["pendingFields"] = []
  
  // 高优先级待补字段
  const highPriorityFields = [
    { fieldId: "receptionSuccessRate", fieldName: "一传到位率", reason: "影响稳定性评估准确度" },
    { fieldId: "attackKills", fieldName: "进攻得分", reason: "影响得分贡献评估" },
    { fieldId: "totalPoints", fieldName: "总得分", reason: "基础统计指标" },
  ]
  
  // 中优先级待补字段
  const mediumPriorityFields = [
    { fieldId: "serveAces", fieldName: "发球ACE", reason: "完善发球表现" },
    { fieldId: "blockPoints", fieldName: "拦网得分", reason: "完善拦网表现" },
    { fieldId: "digs", fieldName: "防守起球", reason: "完善防守表现" },
  ]
  
  // 检查哪些字段缺失
  highPriorityFields.forEach(field => {
    if (rawInput[field.fieldId] === undefined || rawInput[field.fieldId] === null) {
      pending.push({ ...field, importance: "high" })
    }
  })
  
  mediumPriorityFields.forEach(field => {
    if (rawInput[field.fieldId] === undefined || rawInput[field.fieldId] === null) {
      pending.push({ ...field, importance: "medium" })
    }
  })
  
  return pending
}

// 生成待补字段提示
export function generatePendingFieldsSummary(draft: DraftReport): string {
  if (draft.pendingFields.length === 0) {
    return "数据已完整，可生成最终报告"
  }
  
  const highCount = draft.pendingFields.filter(f => f.importance === "high").length
  const mediumCount = draft.pendingFields.filter(f => f.importance === "medium").length
  
  const parts: string[] = []
  parts.push(`还有${draft.pendingFields.length}项数据可补充`)
  
  if (highCount > 0) {
    parts.push(`（${highCount}项高优先级）`)
  }
  
  return parts.join("")
}

// 获取可补充字段的建议顺序
export function getRecommendedFillOrder(draft: DraftReport): string[] {
  // 按重要性排序
  const sorted = [...draft.pendingFields].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 }
    return priorityWeight[b.importance] - priorityWeight[a.importance]
  })
  
  return sorted.map(f => f.fieldId)
}

// 检查是否有未完成的草稿
export function hasUnfinishedDraft(athleteId: string): boolean {
  const drafts = getDraftsByAthlete(athleteId)
  return drafts.some(d => d.version === "draft")
}

// 获取最近的草稿
export function getRecentDraft(athleteId: string): DraftReport | null {
  const drafts = getDraftsByAthlete(athleteId)
    .filter(d => d.version === "draft")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  
  return drafts[0] || null
}
