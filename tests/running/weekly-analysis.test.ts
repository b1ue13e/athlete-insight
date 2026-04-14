import assert from "node:assert/strict"
import { aggregateWeeklyData, compareWeeks } from "@/lib/scoring/running"
import { buildRunningSession, runningRegressionFixtures } from "../fixtures/running/sessions"
import { test } from "../testkit"

test("weekly aggregation summarizes structure and next-week focus", () => {
  const sessions = [
    buildRunningSession({ id: "wk-easy-1", date: "2026-04-14", trainingType: "easy" }),
    buildRunningSession({ id: "wk-tempo", date: "2026-04-15", trainingType: "tempo", durationMin: 42, distanceKm: 8.4 }),
    buildRunningSession({ id: "wk-easy-2", date: "2026-04-17", trainingType: "easy", durationMin: 35, distanceKm: 6.3 }),
    buildRunningSession({ id: "wk-long", date: "2026-04-19", trainingType: "long", durationMin: 95, distanceKm: 17.5 }),
  ]

  const block = aggregateWeeklyData(sessions, "2026-04-14", "2026-04-20")

  assert.equal(block.totals.sessionsCount, 4)
  assert.ok(block.findings.blockVerdict.length > 0)
  assert.ok(block.nextWeekFocus.length > 0)
})

test("week-over-week comparison exposes load and score change", () => {
  const previous = aggregateWeeklyData(
    [
      buildRunningSession({ id: "prev-easy", date: "2026-04-07", distanceKm: 6, durationMin: 36 }),
      buildRunningSession({ id: "prev-long", date: "2026-04-12", trainingType: "long", distanceKm: 14, durationMin: 82 }),
    ],
    "2026-04-07",
    "2026-04-13"
  )

  const current = aggregateWeeklyData(
    [
      buildRunningSession({ id: "cur-easy", date: "2026-04-14", distanceKm: 8, durationMin: 46 }),
      runningRegressionFixtures.longRunFade,
    ],
    "2026-04-14",
    "2026-04-20"
  )

  const comparison = compareWeeks(current, previous)
  assert.notEqual(comparison.changes.distanceChangePct, 0)
  assert.ok(comparison.insights.length > 0)
})
