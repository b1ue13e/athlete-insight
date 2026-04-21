export type AnalysisSport = "volleyball" | "running" | "gym"

export type CanonicalConfidenceBand = "high" | "medium" | "low"
export type CanonicalFindingTone = "positive" | "warning" | "neutral"
export type CanonicalRiskSeverity = "low" | "medium" | "high"

export interface CanonicalScoreDimension {
  key: string
  label: string
  score: number
  verdict: string
  evidence: string[]
}

export interface CanonicalFinding {
  id: string
  title: string
  summary: string
  evidence: string[]
  tone: CanonicalFindingTone
  dimension?: string
}

export interface CanonicalEvidenceItem {
  id: string
  label: string
  detail: string
  dimension?: string
}

export interface CanonicalRiskFlag {
  id: string
  label: string
  detail: string
  severity: CanonicalRiskSeverity
  evidence: string[]
}

export interface CanonicalNextAction {
  id: string
  title: string
  detail: string
  rationale?: string
}

export interface CanonicalTrendHook {
  id: string
  label: string
  value: string
  note: string
}

export interface CanonicalConfidenceSummary {
  score?: number
  band: CanonicalConfidenceBand
  label: string
  summary: string
  caveats: string[]
}

export interface CanonicalInputSummary {
  headline: string
  source: string
  context: string[]
  objective?: string
}

export interface CanonicalScoreOverview {
  finalScore: number
  rangeLabel: string
  verdict: string
  dimensions: CanonicalScoreDimension[]
}

export interface CanonicalAnalysisReport {
  meta: {
    sport: AnalysisSport
    sessionId: string
    generatedAt: string
    version: string
    title: string
    sessionDate: string
  }
  inputSummary: CanonicalInputSummary
  scoreOverview: CanonicalScoreOverview
  keyFindings: CanonicalFinding[]
  evidence: CanonicalEvidenceItem[]
  riskFlags: CanonicalRiskFlag[]
  nextActions: CanonicalNextAction[]
  confidence: CanonicalConfidenceSummary
  trendHooks: CanonicalTrendHook[]
  sportSpecific?: Record<string, unknown>
}

export interface AnalysisEnvelope<TInput = unknown, TRawReport = unknown> {
  sport: AnalysisSport
  input: TInput
  report: TRawReport
  canonical: CanonicalAnalysisReport
}
