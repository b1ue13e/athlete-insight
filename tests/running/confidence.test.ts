import assert from "node:assert/strict"
import { calculateRunningScore } from "@/lib/scoring/running/engine"
import { runningRegressionFixtures } from "../fixtures/running/sessions"
import { test } from "../testkit"

test("manual entry without heart rate downgrades confidence", () => {
  const report = calculateRunningScore(runningRegressionFixtures.manualNoHeartRate)
  assert.ok(report.confidence.score < 90)
  assert.ok(report.confidence.missingData.includes("heartRate"))
})

test("full watch input keeps confidence high", () => {
  const report = calculateRunningScore({
    ...runningRegressionFixtures.easyGrayZone,
    rpe: 4,
    avgHeartRate: 145,
    maxHeartRate: 190,
  })
  assert.equal(report.confidence.band, "high")
})

test("interval session without splits loses confidence", () => {
  const report = calculateRunningScore({
    ...runningRegressionFixtures.intervalLateLoss,
    splits: undefined,
    avgPaceSec: 268,
  })
  assert.ok(report.confidence.score <= 78)
  assert.ok(report.confidence.reasons.some((reason) => reason.includes("split")))
})

test("missing plan is reflected in confidence metadata", () => {
  const report = calculateRunningScore({
    ...runningRegressionFixtures.manualNoHeartRate,
    plannedDistance: undefined,
    plannedDuration: undefined,
    plannedPaceRange: undefined,
    plannedHeartRateRange: undefined,
  })
  assert.ok(report.confidence.missingData.includes("plan"))
})
