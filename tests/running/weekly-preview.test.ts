import assert from "node:assert/strict"
import { buildRunningWeeklyPreview, getRunningWeekRange, mergeRunningSessions } from "@/lib/scoring/running"
import { buildRunningSession, runningRegressionFixtures } from "../fixtures/running/sessions"
import { test } from "../testkit"

test("week range uses local calendar dates without ISO drift", () => {
  const range = getRunningWeekRange(new Date("2026-04-20T12:00:00+08:00"))

  assert.equal(range.startDate, "2026-04-14")
  assert.equal(range.endDate, "2026-04-20")
})

test("current weekly preview aggregates only sessions inside the selected week", () => {
  const preview = buildRunningWeeklyPreview(
    [
      buildRunningSession({ id: "current-week-easy", date: "2026-04-14" }),
      runningRegressionFixtures.longRunFade,
      buildRunningSession({ id: "older-week", date: "2026-04-06" }),
    ],
    "2026-04-20"
  )

  assert.equal(preview.block.totals.sessionsCount, 2)
  assert.equal(preview.hasSessions, true)
  assert.match(preview.detail, /2 次训练/)
})

test("mergeRunningSessions keeps the current draft session and removes stale duplicates", () => {
  const draft = buildRunningSession({ id: "draft-session", distanceKm: 12 })
  const merged = mergeRunningSessions(
    [
      buildRunningSession({ id: "draft-session", distanceKm: 8 }),
      buildRunningSession({ id: "existing-session", date: "2026-04-16" }),
    ],
    draft
  )

  assert.equal(merged.length, 2)
  assert.equal(merged[0]?.distanceKm, 12)
  assert.equal(merged.filter((session) => session.id === "draft-session").length, 1)
})
