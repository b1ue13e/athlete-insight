export type AdvancedInsightEvidenceLevel = "strong" | "medium" | "weak"

export interface RunningAdvancedInsight<TData = Record<string, unknown>> {
  key: "cardiac-decoupling" | "lactate-threshold" | "biomechanical-decay"
  title: string
  available: boolean
  experimental: true
  evidenceLevel: AdvancedInsightEvidenceLevel
  requiredFields: string[]
  failureReason?: string
  summary?: string
  data?: TData
}

export interface RunningAdvancedInsightBundle {
  available: boolean
  insights: RunningAdvancedInsight[]
}

export interface DisplayableAdvancedInsight {
  title: string
  summary: string
  evidenceLevel: AdvancedInsightEvidenceLevel
  experimental: true
  lines: string[]
}
