import assert from "node:assert/strict"
import { calculateGymScore } from "@/lib/scoring/gym"
import { gymRegressionFixtures } from "./fixtures/gym/sessions"
import { test } from "./testkit"

test("hypertrophy session with too little useful work surfaces volume and effective-set issues", () => {
  const report = calculateGymScore(gymRegressionFixtures.hypertrophyInsufficient)
  assert.ok(report.detectedDeviations.some((item) => item.code === "effective_sets_insufficient"))
  assert.ok(report.detectedDeviations.some((item) => item.code === "volume_too_low_for_hypertrophy"))
})

test("strength session with only light moderate-rep work is flagged as too low intensity", () => {
  const report = calculateGymScore(gymRegressionFixtures.strengthLowIntensity)
  assert.ok(report.detectedDeviations.some((item) => item.code === "intensity_too_low_for_strength"))
  assert.ok(report.scoreBreakdown.goalAlignment.score < 70)
})

test("accessory-heavy push day without the main lift is called out clearly", () => {
  const report = calculateGymScore(gymRegressionFixtures.mainLiftMissingAccessoryOverload)
  assert.ok(report.detectedDeviations.some((item) => item.code === "compound_lift_missing"))
  assert.ok(report.detectedDeviations.some((item) => item.code === "accessory_over_main_lift"))
})

test("beginner full-body session can still earn a solid report without advanced data", () => {
  const report = calculateGymScore(gymRegressionFixtures.beginnerSolidStructure)
  assert.ok(report.finalScore >= 70)
  assert.equal(report.advancedInsightsAvailable, true)
})

test("high-fatigue high-volume day raises fatigue risk deviation", () => {
  const report = calculateGymScore(gymRegressionFixtures.highFatigueHighVolume)
  assert.ok(report.detectedDeviations.some((item) => item.code === "excessive_fatigue_risk"))
})
