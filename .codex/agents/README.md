# Athlete Insight subagents

These project-level Codex subagents were installed from:

- `E:\resume\athlete-insight\awesome-codex-subagents-main.zip`

They live in:

- `E:\resume\athlete-insight\.codex\agents\`

So they apply **only to this repo** and take precedence over any global agents with the same name.

## Installed agents

### Architecture / implementation
- `nextjs-developer.toml`
- `typescript-pro.toml`
- `backend-developer.toml`
- `api-designer.toml`
- `refactoring-specialist.toml`

### Quality / debugging
- `reviewer.toml`
- `browser-debugger.toml`
- `performance-engineer.toml`
- `accessibility-tester.toml`
- `qa-expert.toml`

### Data / product / design
- `postgres-pro.toml`
- `product-manager.toml`
- `ui-designer.toml`
- `docs-researcher.toml`

## Best-fit mapping for this repo

Use these when working on Athlete Insight:

- **Next.js App Router / page behavior**
  - `nextjs-developer`
- **Type narrowing / schema / contract cleanup**
  - `typescript-pro`
- **API routes / persistence / server-side behavior**
  - `backend-developer`
- **Session / diagnosis / data-contract design**
  - `api-designer`
- **Supabase schema / SQL / query review**
  - `postgres-pro`
- **History / detail / regression review**
  - `reviewer`
- **UI regressions in complex pages**
  - `browser-debugger`
- **Loading / rendering / chart / bundle performance**
  - `performance-engineer`
- **Accessibility pass on dashboard / forms**
  - `accessibility-tester`
- **Product-priority or flow critique**
  - `product-manager`
- **Design polish / hierarchy / interaction**
  - `ui-designer`
- **Official docs verification before changing behavior**
  - `docs-researcher`
- **Feature cleanup without architecture churn**
  - `refactoring-specialist`

## Example delegation prompts

### 1. Review a risky change
Use `reviewer` on the diagnosis/session persistence changes in this branch. Focus on correctness, regressions, and missing edge-case coverage.

### 2. Check a Next.js rendering issue
Use `nextjs-developer` on `/analysis/[id]` and `/history` to verify client/server boundaries, hydration safety, and route behavior.

### 3. Audit database changes
Use `postgres-pro` on the new Supabase migrations for `analysis_sessions`, `diagnosis_records`, and sport-specific enhancement tables.

### 4. Debug a UI flow
Use `browser-debugger` on the gym athlete-binding flow and identify the smallest safe fix for any broken interaction.

### 5. Product critique
Use `product-manager` to critique whether the current running → diagnosis → week-review flow is clear enough for repeat use.

## Practical note

I installed a **curated subset** of the archive instead of all 136 agents so the repo gets the most relevant ones without unnecessary noise.
