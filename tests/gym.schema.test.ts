import assert from "node:assert/strict"
import { GymSessionInputSchema } from "@/lib/scoring/gym"
import { buildGymSession } from "./fixtures/gym/sessions"
import { test } from "./testkit"

test("gym schema accepts manual-first beginner session", () => {
  const parsed = GymSessionInputSchema.parse(buildGymSession())
  assert.equal(parsed.sport, "gym")
  assert.equal(parsed.source, "manual")
})

test("gym schema rejects exercises without reps", () => {
  const result = GymSessionInputSchema.safeParse({
    ...buildGymSession(),
    exercises: [
      {
        ...buildGymSession().exercises[0],
        repsPerSet: [],
      },
    ],
  })

  assert.equal(result.success, false)
})

test("gym schema rejects per-set arrays with illegal lengths", () => {
  const result = GymSessionInputSchema.safeParse({
    ...buildGymSession(),
    exercises: [
      {
        ...buildGymSession().exercises[0],
        sets: 3,
        rpePerSet: [7, 8],
      },
    ],
  })

  assert.equal(result.success, false)
})
