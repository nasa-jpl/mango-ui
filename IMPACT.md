# IMPACT.md — Testing Strategy Implementation Log

Contemporaneous log of the testing-strategy work described in `TESTING_STRATEGY.md`.
Records defects found, mutants killed, per-phase metric snapshots, and open questions
for maintainers. Baseline reference is `TESTING_STRATEGY.md` §2 (commit `022829f`).

---

## Baseline reproduction (pre-change)

Re-ran the §2 commands on `add-testing` (HEAD `b80d385`, whose parent is the baseline
commit `022829f`; `b80d385` only adds strategy docs, so source is unchanged). Results
match §2 exactly:

| Metric                                | §2                 | Reproduced         |
| ------------------------------------- | ------------------ | ------------------ |
| Unit tests                            | 10 / 3 files       | 10 / 3 files       |
| Statement coverage (app)              | 3.26%              | 3.26%              |
| Branch coverage (app)                 | 47.61%             | 47.61%             |
| Function coverage (app)               | 17.44%             | 17.44%             |
| Statement coverage (`src/utilities/`) | 33.45%             | 33.45%             |
| Mutation score, total                 | 21.70%             | 21.70%             |
| Mutation score, covered               | 83.92%             | 83.92%             |
| Killed / timeout / survived / no-cov  | 117 / — / 23 / 410 | 117 / 3 / 23 / 410 |
| Mutation runtime                      | ~7s                | ~8s                |

Survivor distribution: 21 in `view.ts`, 2 in `product.ts` (= 23).

---

## Defects / suspected defects

| #   | Location                    | Description                                                                                                                                                              | Status                         |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| D1  | `src/utilities/api.ts`      | Treats HTTP status 200–400 as success, which includes 3xx redirects. Per §1/Phase 1.2 this is flagged, not changed. Needs a characterization test + maintainer decision. | Open — to be tested in Phase 1 |
| D2  | `src/utilities/view.ts:215` | `formatYValue` d3 format specifier `"~g"` → `""` mutant survives: tests call the function but never assert on formatted output.                                          | Open — to be killed in Phase 1 |

## Surviving mutants killed (running count vs. 23 baseline)

- Killed so far: **0 / 23**.

## Open questions for maintainers

- **Q1 (D1)**: Is the 200–400 success window in `api.ts` intentional (accepting 3xx)? Test
  will document current behavior; product behavior unchanged pending your call.
- **Q2 (artifacts/gitignore)**: `test-metrics/` is currently gitignored (`.gitignore:42`).
  Phase 0.3/0.4/0.7 require committing machine-readable JSON artifacts under
  `test-metrics/coverage/` and `test-metrics/mutation/`. Plan: keep ignoring bulky/
  regenerated outputs (HTML report, lcov, `.stryker-tmp`) but un-ignore the small JSON
  summaries (`coverage-summary.json`, mutation `metrics.json`/`mutation.json`) so before/
  after is a diffable committed trail per §5 ("Preserve baselines").

## Per-phase metric snapshots

### Phase 0 — Infrastructure (in progress)

- Start: baseline as above. No product code changes permitted this phase.
- **Node**: repo `.nvmrc` pins `v24.14.0` (`.npmrc` has `engine-strict=true`); installs
  require node ≥20.19 (`@cesium/engine`). Baseline metrics reproduced identically on both
  node 18 and 24, so measurement is version-stable.
- **Dev dependencies added** (Phase 0.2, required for DOM/component testing):
  `jsdom@^24.1.0`, `@testing-library/react@^14.3.1`, `@testing-library/jest-dom@^6.4.6`,
  `@testing-library/user-event@^14.5.2`. No runtime/product deps changed.
- **Steps 1–2 done**: vitest `include` now `./src/**/*.test.{ts,tsx}`; default env `node`,
  jsdom opt-in per-file via `// @vitest-environment jsdom`; setup file
  `src/test-utils/setup.ts` (jest-dom matchers). Verified render + user-event work; the
  10 existing tests still pass. Gates green (unit/lint/lint:css/build).
- **Step 3 done (coverage config)**: v8, `all: true`, `include: ["src/**"]`, reporters
  `text`/`lcov`/`json-summary`, output `test-metrics/coverage/`. Exclusions: `src/types/**`,
  `src/main.tsx`, test files, `src/test-utils/**`, Cesium render path
  `src/components/entities/map/**`.
  - Per-scope number that matters is unchanged: `src/utilities/` = **33.45%** (== §2).
    Test count 10, mutation unaffected.
  - Whole-app statement % moved 3.26% → **2.60%**: `all: true` + explicit `include: src/**`
    enlarges the denominator (10,562 stmts) vs. the config-less baseline run. Per §5 this
    global number is never a headline; recording the shift for transparency.
  - Canvas Chart.js / ag-grid render paths intentionally **not** excluded yet: they still
    contain untested logic that is the Phase 2 worklist. Threshold-level exclusions for
    those render paths will be applied in Phase 5, not as report deletions (anti-gaming).
- **Step 4 done (Stryker)**: added `json` reporter → `test-metrics/mutation/mutation.json`
  (diffable artifact); `incremental: true` with `incrementalFile: .stryker-tmp/incremental.json`.
  Re-ran: mutation score unchanged — total **21.70%**, covered **83.92%**, killed 117 /
  timeout 3 / survived 23 / no-cov 410 (== §2). Scope still logic-only (`src/utilities/**`).
- **Step 5 done (factories relocated)**: moved `generic.ts`/`product.ts`/`view.ts` from
  `e2e-tests/utilities/` → `src/test-utils/factories/`, fixed relative imports, and updated
  the two unit tests (`dataset.test.ts`, `view.test.ts`). The inverted dependency (unit
  tests importing from the e2e tree) is removed. No e2e spec imported these, so no e2e
  changes needed. 10 tests still pass; gates green.
- **Step 6 done (TZ pinning)**: `test` and `test:unit` scripts now run under `TZ=UTC`.
  Explicit non-UTC time cases will be added with the `time.ts` work in Phase 1. 10 tests
  still pass under UTC.
- **Step 7 done (machine-readable baseline committed)** — resolves Q2. Adjusted
  `.gitignore` to keep ignoring bulky/regenerated outputs (HTML report, `lcov.info`,
  `.stryker-tmp`) but **un-ignore** the two small diffable summaries. Committed:
  `test-metrics/coverage/coverage-summary.json`, `test-metrics/mutation/mutation.json`,
  and preserved the authored `test-metrics/baseline.md` record (was untracked/ignored).
  Regenerated numbers match §2/prior: utilities coverage 33.45%, mutation 21.70% total /
  83.92% covered, 117/3/23/410, 10 tests. These JSON files are the additive machine-readable
  baseline for before/after diffs (§5/§7).
