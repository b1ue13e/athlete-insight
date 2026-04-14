import assert from "node:assert/strict"
import { calculateRunningScore } from "@/lib/scoring/running"
import { runningRegressionFixtures } from "../fixtures/running/sessions"
import { test } from "../testkit"

test("easy run that drifts into gray zone is detected and down-scored", () => {
  const report = calculateRunningScore(runningRegressionFixtures.easyGrayZone)
  assert.ok(report.detectedDeviations.some((item) => item.code === "easy_gray_zone"))
  assert.ok(report.scoreBreakdown.final.score < 75)
})

test("tempo run with front-loaded pacing surfaces a tempo collapse deviation", () => {
  const report = calculateRunningScore(runningRegressionFixtures.tempoFrontLoaded)
  assert.ok(report.detectedDeviations.some((item) => item.code === "tempo_front_loaded"))
  assert.equal(report.strongestSignal.direction, "positive")
})

test("interval session with late rep fade flags interval control loss", () => {
  const report = calculateRunningScore(runningRegressionFixtures.intervalLateLoss)
  assert.ok(report.detectedDeviations.some((item) => item.code === "interval_late_loss"))
  assert.ok(report.biggestCorrection.detail.length > 0)
})

test("long run with heavy second-half fade is marked as a long-run deviation", () => {
  const report = calculateRunningScore(runningRegressionFixtures.longRunFade)
  assert.ok(report.detectedDeviations.some((item) => item.code === "long_run_fade"))
  assert.ok(report.scoreBreakdown.pacingControl.score <= 76)
})

test("plan shortfall is flagged even when the raw activity is otherwise valid", () => {
  const report = calculateRunningScore(runningRegressionFixtures.planShortfall)
  assert.ok(report.detectedDeviations.some((item) => item.code === "plan_under_completed"))
})

test("advanced insights availability does not block the main running score", () => {
  const report = calculateRunningScore(runningRegressionFixtures.manualNoHeartRate)
  assert.equal(report.advancedInsightsAvailable, false)
  assert.equal(typeof report.scoreBreakdown.final.score, "number")
})
