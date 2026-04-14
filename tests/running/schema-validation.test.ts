import assert from "node:assert/strict"
import { RunningSessionInputSchema, parseRunningSessionInput } from "@/lib/scoring/running"
import { buildRunningSession } from "../fixtures/running/sessions"
import { test } from "../testkit"

test("running schema accepts manual-first input without heart rate", () => {
  const parsed = parseRunningSessionInput(
    buildRunningSession({
      source: "manual",
      avgHeartRate: undefined,
      maxHeartRate: undefined,
      heartRateSeries: undefined,
    })
  )

  assert.equal(parsed.source, "manual")
  assert.equal(parsed.avgHeartRate, undefined)
})

test("running schema rejects input without avg pace or splits", () => {
  const result = RunningSessionInputSchema.safeParse(
    buildRunningSession({
      avgPaceSec: undefined,
      splits: undefined,
    })
  )

  assert.equal(result.success, false)
})

test("running schema rejects avg heart rate above max heart rate", () => {
  const result = RunningSessionInputSchema.safeParse(
    buildRunningSession({
      avgHeartRate: 181,
      maxHeartRate: 175,
    })
  )

  assert.equal(result.success, false)
})

test("running schema rejects illegal training type values", () => {
  const result = RunningSessionInputSchema.safeParse({
    ...buildRunningSession(),
    trainingType: "junk",
  })

  assert.equal(result.success, false)
})
