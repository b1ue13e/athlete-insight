# Running Scoring Development

## Scope

Running Score v1.0 lives under `lib/scoring/running/`.

- `schemas.ts`: strict input/output contracts and Zod validation
- `templates.ts`: training templates and goal-value matrix
- `engine.ts`: rule-based single-session scoring and deviation detection
- `confidence.ts`: confidence downgrade rules
- `weekly-analysis.ts`: weekly block aggregation and comparison
- `advanced/`: optional advanced insights only, never score-driving
- `report-adapter.ts`: report-page safe view model

## Add A Scoring Rule

1. Update `lib/scoring/running/engine.ts`.
2. Keep the rule deterministic and local to one dimension when possible.
3. If the rule should surface user-facing feedback, add or update a `RunningDeviation`.
4. If the rule changes required evidence, review `confidence.ts`.
5. Add or update:
   - `tests/running/engine.test.ts`
   - `tests/running/regression-fixtures.test.ts`

Rule checklist:

- Main score must stay rule/statistics-driven.
- Advanced physiology or biomechanics may explain, but not decide.
- Output must still include structured `detectedDeviations`, `strongestSignal`, and `biggestCorrection`.

## Add A Training Template

1. Add the new template in `lib/scoring/running/templates.ts`.
2. Define:
   - label and summary
   - expected RPE band
   - optional heart-rate ratio band
   - ideal duration band
   - pacing variance and slowdown limits
   - final-score dimension weights
3. If goal relevance changes, update `GOAL_VALUE_MATRIX`.
4. Add at least one positive case and one failure case in `tests/running/engine.test.ts`.

## Add A Regression Fixture

Regression fixtures live in `tests/fixtures/running/sessions.ts`.

1. Add a named fixture with a stable scenario.
2. Add its expected score envelope and key deviation in `tests/running/regression-fixtures.test.ts`.
3. Keep expectations broad enough to allow small tuning, but tight enough to catch behavior drift.

Good regression fixtures:

- manual entry with sparse data
- easy run that drifts too hard
- tempo session that front-loads
- interval session with late collapse
- long run with second-half fade
- plan shortfall

## Commands

```bash
npm run typecheck
npm test
npm run test:running
```

## Notes

- `app/analysis/new/running/page.tsx` and `app/analysis/new/running/import/page.tsx` should consume the structured running report through the adapter layer.
- `app/telemetry/running/page.tsx` may show advanced insights, but those insights must remain visually and logically secondary.
- Volleyball scoring behavior is protected by `tests/volleyball/behavior-baseline.test.ts`; running changes should not change those expectations.
