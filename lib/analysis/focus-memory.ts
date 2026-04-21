import type { AnalysisSport } from "./contracts"

export interface SavedCorrectionFocus {
  sport: AnalysisSport
  title: string
  detail: string
  savedAt: string
}

function getStorageKey(sport: AnalysisSport) {
  return `athlete_insight:next_focus:${sport}`
}

export function getSavedCorrectionFocus(sport: AnalysisSport): SavedCorrectionFocus | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(sport))
    return raw ? (JSON.parse(raw) as SavedCorrectionFocus) : null
  } catch {
    return null
  }
}

export function saveCorrectionFocus(sport: AnalysisSport, focus: Omit<SavedCorrectionFocus, "sport" | "savedAt">) {
  if (typeof window === "undefined") {
    return
  }

  const payload: SavedCorrectionFocus = {
    sport,
    title: focus.title,
    detail: focus.detail,
    savedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(getStorageKey(sport), JSON.stringify(payload))
}

export function clearSavedCorrectionFocus(sport: AnalysisSport) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(getStorageKey(sport))
}
