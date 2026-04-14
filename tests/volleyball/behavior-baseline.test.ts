import assert from "node:assert/strict"
import { calculateVolleyballScore } from "@/lib/scoring-engine"
import { test } from "../testkit"

test("volleyball scoring baseline stays stable for an outside hitter sample", () => {
  const result = calculateVolleyballScore({
    match_name: "League Match",
    opponent: "Rivals",
    player_position: "主攻",
    session_date: "2026-04-14",
    total_points: 16,
    total_points_lost: 9,
    serve_aces: 2,
    serve_errors: 1,
    attack_kills: 11,
    attack_errors: 3,
    blocked_times: 1,
    reception_success_rate: 68,
    block_points: 2,
    digs: 6,
    clutch_performance_score: 74,
    error_tags: [],
    notes: "",
  })

  assert.equal(result.overall_score, 72)
  assert.equal(result.sub_scores.scoring_contribution, 68)
  assert.equal(result.sub_scores.error_control, 79)
})

test("volleyball libero sample still rewards stability over attack volume", () => {
  const result = calculateVolleyballScore({
    match_name: "League Match",
    opponent: "Rivals",
    player_position: "自由人",
    session_date: "2026-04-14",
    total_points: 2,
    total_points_lost: 4,
    serve_aces: 0,
    serve_errors: 0,
    attack_kills: 0,
    attack_errors: 0,
    blocked_times: 0,
    reception_success_rate: 82,
    block_points: 0,
    digs: 14,
    clutch_performance_score: 71,
    error_tags: [],
    notes: "",
  })

  assert.ok(Number.isFinite(result.overall_score))
  assert.ok(result.sub_scores.stability >= result.sub_scores.scoring_contribution)
})
