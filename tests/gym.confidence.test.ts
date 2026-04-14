import assert from "node:assert/strict"
import { calculateGymScore } from "@/lib/scoring/gym"
import { gymRegressionFixtures } from "./fixtures/gym/sessions"
import { test } from "./testkit"

test("missing plan and effort markers downgrades confidence but still returns a report", () => {
  const report = calculateGymScore(gymRegressionFixtures.lowConfidenceMissingData)
  assert.ok(report.confidenceBand === "low" || report.confidenceBand === "medium")
  assert.ok(report.confidence.confidenceReasons.length > 0)
  assert.equal(typeof report.finalScore, "number")
})
