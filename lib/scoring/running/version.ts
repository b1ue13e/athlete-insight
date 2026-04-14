export const RUNNING_SCORE_VERSION = "1.0.0"
export const RUNNING_SCORE_TEMPLATE_VERSION = "2026-04-running-v1"

export interface RunningScoringMetadata {
  version: string
  templateVersion: string
  generatedAt: string
}

export function getRunningScoringMetadata(): RunningScoringMetadata {
  return {
    version: RUNNING_SCORE_VERSION,
    templateVersion: RUNNING_SCORE_TEMPLATE_VERSION,
    generatedAt: new Date().toISOString(),
  }
}
