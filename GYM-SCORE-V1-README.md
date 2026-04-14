# Gym Score v1.0

## What It Solves

Gym Score v1.0 is built to answer one product question:

Did this strength / hypertrophy / fat-loss session actually serve the current goal?

It does not try to be:

- a generic workout logger
- an exercise encyclopedia
- a high-complexity physiology lab

It focuses on:

- `CompletionScore`
- `StimulusQualityScore`
- `LoadReasonablenessScore`
- `GoalAlignmentScore`
- structured deviations
- next-session corrections

## Module Layout

The gym module lives under `lib/scoring/gym/`.

- `schemas.ts`: Zod input/output contracts
- `templates.ts`: `goalType × splitType × sessionTag` templates
- `exercise-library.ts`: lightweight exercise metadata helpers
- `confidence.ts`: report confidence, independent from performance score
- `engine.ts`: single-session Gym Score v1.0
- `weekly-analysis.ts`: weekly block review
- `mesocycle-analysis.ts`: 3-6 week review
- `advanced/`: optional advanced insights
- `version.ts`: version metadata

Shared entrypoint:

- `lib/scoring/registry.ts`

## Core Input

Primary runtime input is `GymSessionInput`.

Manual-first flow is the default:

- sport
- goalType
- splitType
- sessionTag
- sessionDate
- durationMin
- exercises
- optional planned session fields
- optional fatigue / soreness / sleep

Each exercise requires:

- `exerciseName`
- `movementPattern`
- `primaryMuscles`
- `equipment`
- `compoundOrIsolation`
- `sets`
- `repsPerSet`

Optional but recommended:

- `loadPerSet`
- `rpePerSet`
- `rirPerSet`
- `restSec`

## Main Output

`calculateGymScore()` returns:

- `finalGymScore`
- `scoreRange`
- `confidenceBand`
- `scoreBreakdown`
- `detectedDeviations`
- `muscleGroupSummary`
- `movementPatternCoverage`
- `nextSessionSuggestions`
- optional advanced insights

## Weekly And Mesocycle

- `analyzeGymWeeklyBlock()` aggregates weekly sets, pattern distribution, push-pull balance, upper-lower balance, recovery pressure, skipped planned sessions, and next-week advice.
- `analyzeGymMesocycle()` reviews 3-6 weeks for main-lift trends, volume trend, recovery pressure trend, plan execution drift, and deload need.

## Advanced Insights

Advanced insights are intentionally non-blocking.

Current optional layers:

- estimated strength metrics
- volume landmarks
- fatigue signals

Each insight includes:

- `evidenceLevel`
- `requiredFields`
- optional `failureReason`

## Frontend

User-facing gym pages:

- `app/gym/page.tsx`
- `app/analysis/new/gym/page.tsx`

The report narrative is organized around:

1. top conclusion
2. four-dimension scores
3. deviation diagnosis
4. muscle and pattern coverage
5. next-session suggestions
6. weekly preview
7. advanced insights

## Tests

Gym tests run through the existing lightweight test runner:

```bash
npm run test:gym
```

Coverage currently includes:

- schema validation
- scoring engine deviations
- confidence downgrade
- weekly analysis
- mesocycle analysis
- regression fixtures
