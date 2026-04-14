import assert from "node:assert/strict"
import { analyzeGymWeeklyBlock } from "@/lib/scoring/gym"
import { gymWeeklyFixtures } from "./fixtures/gym/sessions"
import { test } from "./testkit"

test("push-heavy week exposes back, legs, and push-pull structure issues", () => {
  const report = analyzeGymWeeklyBlock(gymWeeklyFixtures.pushHeavyWeek)
  assert.ok(report.keyImbalanceFlags.includes("back_volume_insufficient"))
  assert.ok(report.keyImbalanceFlags.includes("leg_training_avoidance"))
  assert.ok(report.keyImbalanceFlags.includes("push_pull_imbalance"))
})
