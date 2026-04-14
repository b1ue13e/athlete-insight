import { analyzeVolleyball } from "../mock-analysis"
import { calculateRunningScore, aggregateWeeklyData, RUNNING_SCORE_VERSION } from "./running"
import { analyzeGymMesocycle, analyzeGymWeeklyBlock, calculateGymScore, GYM_SCORE_VERSION } from "./gym"

export type SupportedScoringSport = "volleyball" | "running" | "gym"

export interface ScoringRegistryEntry {
  sport: SupportedScoringSport
  version: string
  analyzeSession: (input: any) => any
  analyzeWeekly?: (input: any) => any
  analyzeMesocycle?: (input: any) => any
}

export const scoringRegistry: Record<SupportedScoringSport, ScoringRegistryEntry> = {
  volleyball: {
    sport: "volleyball",
    version: "legacy-v2",
    analyzeSession: analyzeVolleyball,
  },
  running: {
    sport: "running",
    version: RUNNING_SCORE_VERSION,
    analyzeSession: calculateRunningScore,
    analyzeWeekly: ({ sessions, weekStart, weekEnd }: { sessions: Parameters<typeof aggregateWeeklyData>[0]; weekStart: string; weekEnd: string }) =>
      aggregateWeeklyData(sessions, weekStart, weekEnd),
  },
  gym: {
    sport: "gym",
    version: GYM_SCORE_VERSION,
    analyzeSession: calculateGymScore,
    analyzeWeekly: analyzeGymWeeklyBlock,
    analyzeMesocycle: analyzeGymMesocycle,
  },
}

export function getScoringModule(sport: SupportedScoringSport): ScoringRegistryEntry {
  return scoringRegistry[sport]
}
