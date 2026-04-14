import type { RunningAdvancedInsightBundle, DisplayableAdvancedInsight } from "./types"

export function buildDisplayableAdvancedInsights(bundle: RunningAdvancedInsightBundle): DisplayableAdvancedInsight[] {
  return bundle.insights
    .filter((insight) => insight.available && insight.summary)
    .map((insight) => {
      const lines: string[] = []
      if (insight.data && typeof insight.data === "object") {
        Object.entries(insight.data).forEach(([key, value]) => {
          lines.push(`${key}: ${value}`)
        })
      }

      return {
        title: insight.title,
        summary: insight.summary!,
        evidenceLevel: insight.evidenceLevel,
        experimental: true,
        lines,
      }
    })
}
