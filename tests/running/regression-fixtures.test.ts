import assert from "node:assert/strict"
import { calculateRunningScore } from "@/lib/scoring/running"
import { RUNNING_SCORE_VERSION } from "@/lib/scoring/running/version"
import { runningRegressionFixtures } from "../fixtures/running/sessions"
import { test } from "../testkit"

test("running regression fixtures stay within expected score envelopes", () => {
  const expectations = [
    { id: "manualNoHeartRate", min: 80, max: 95, code: undefined },
    { id: "easyGrayZone", min: 35, max: 75, code: "easy_gray_zone" },
    { id: "tempoFrontLoaded", min: 35, max: 78, code: "tempo_front_loaded" },
    { id: "intervalLateLoss", min: 60, max: 78, code: "interval_late_loss" },
    { id: "longRunFade", min: 76, max: 86, code: "long_run_fade" },
    { id: "planShortfall", min: 30, max: 72, code: "plan_under_completed" },
  ] as const

  expectations.forEach(({ id, min, max, code }) => {
    const report = calculateRunningScore(runningRegressionFixtures[id])
    assert.equal(report.version, RUNNING_SCORE_VERSION)
    assert.ok(report.scoreBreakdown.final.score >= min && report.scoreBreakdown.final.score <= max)
    if (code) {
      assert.ok(report.detectedDeviations.some((item) => item.code === code))
    }
  })
})
