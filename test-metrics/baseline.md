# Test Metrics Baseline — Pre-AI Test Generation

**Date:** 2026-07-23
**Commit:** `27e8582` (branch `add-testing`)
**Measured with:** `npx vitest run --coverage --coverage.include='src/**'` (@vitest/coverage-v8 1.6.1)

## Coverage (all of `src/`)

| Metric     | Covered / Total | %      |
| ---------- | --------------- | ------ |
| Lines      | 275 / 11,088    | 2.48%  |
| Statements | 275 / 11,088    | 2.48%  |
| Functions  | 10 / 77         | 12.98% |
| Branches   | 45 / 97         | 46.39%¹ |

¹ Branch % is inflated: v8 only enumerates branches in files that were actually executed. Line coverage (2.48%) is the honest headline number.

## Test inventory

| Category                | Count | LOC  | Scope |
| ----------------------- | ----- | ---- | ----- |
| Unit test files         | 3     | 511  | `src/utilities/` only (dataset, generic, view) |
| Unit tests (cases)      | 10    |      | all passing |
| Component/UI tests      | 0     | 0    | no @testing-library/react or jsdom installed |
| E2E specs (Playwright)  | 2     | 69   | Navigation, Entities |

## Mutation testing (StrykerJS 8.7.1, `src/utilities/` only)

Run: `npx stryker run` — full report at `test-metrics/mutation/mutation-report.html`

| Metric | Value |
| --- | --- |
| **Mutation score (total)** | **21.70%** |
| Mutation score (covered code only) | 83.92% |
| Mutants killed | 117 (+3 by timeout) |
| Mutants survived | 23 |
| Mutants with no coverage | 410 |
| Total mutants | 553 |

Per file (total score): view.ts 42.79%, product.ts 15.15%, generic.ts 14.04%, api.ts 0%, time.ts 0%.

Interpretation: where tests exist they are fairly rigorous (84% of covered mutants killed), but 74% of all mutants in the utilities layer are in code no test touches. Notable survivors even in tested code: `formatYValue` boundary conditions in view.ts (`< 0.0001` vs `<= 0.0001`, `> 9999` vs `>= 9999`) and its d3 format string — the tests exercise the function but don't pin the thresholds.

## Source under test

- 56 source files, ~11,400 LOC (`src/**/*.ts{,x}`, excluding tests)
- **Zero coverage** in: all routes, all entity components (Chart, Map, Table, Text, Timeline, TimelineRow, DownlinkDashboard), all UI components (EntityEditor, ProductSelector, DataGrid), `utilities/api.ts`, `utilities/time.ts`, hooks
- Partial coverage in `src/utilities/`: view.ts 61.32%, generic.ts 28.07%, product.ts 26.22%; api.ts and time.ts at 0%

## Notes

- This branch has no `time.test.ts` (present on `193_update`), hence 10 tests vs. 11 there.
- Vitest config (`vite.config.ts`) only includes `src/**/*.test.ts` — no `.test.tsx` pattern, consistent with no component tests existing.
- No coverage provider was installed before this measurement; `@vitest/coverage-v8` added to devDependencies 2026-07-23.
