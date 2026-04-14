import assert from "node:assert/strict"
import { analyzeGymMesocycle } from "@/lib/scoring/gym"
import { gymMesocycleFixtures } from "./fixtures/gym/sessions"
import { test } from "./testkit"

test("repeated high-fatigue high-volume block recommends a deload", () => {
  const report = analyzeGymMesocycle(gymMesocycleFixtures.deloadCandidate)
  assert.equal(report.needsDeload, true)
  assert.ok((report.deloadReason ?? "").length > 0)
})
