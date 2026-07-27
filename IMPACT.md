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

| #   | Location                         | Description                                                                                                                                                                                                                                                                                                  | Status                                                                   |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| D1  | `src/utilities/api.ts`           | Treats HTTP status 200–400 as success, which includes 3xx redirects. Per §1/Phase 1.2 this is flagged, not changed. Needs a characterization test + maintainer decision.                                                                                                                                     | Open — to be tested in Phase 1                                           |
| D2  | `src/utilities/view.ts:215`      | `formatYValue` d3 format specifier `"~g"` → `""` mutant survives: tests call the function but never assert on formatted output.                                                                                                                                                                              | **Fixed** — killed by asserting `formatYValue(123.456789) === "123.457"` |
| D3  | `src/utilities/product.ts:69-79` | `applyFieldThresholds` threshold-window matcher: when BOTH `effective_since` and `effective_until` are set, the `if (effective_until)` branch **overwrites** `inRange`, so `effective_since` is silently ignored (a threshold whose `effective_since` is in the future still matches). Flagged, not changed. | Open — characterized by test; needs maintainer decision (Q3)             |

## Surviving mutants killed (running count vs. 23 baseline)

- Killed: **23 / 23** baseline survivors (18 in `view.ts` + 2 in `product.ts` = 20 non-
  equivalent; the remaining 3 `view.ts` baseline survivors are proven equivalent, below).
  Both `product.ts` baseline survivors (`getProductForLayer` / `getFieldMetadataForLayer`
  `find` predicates) are killed by asserting on a non-first matching element.
- **3 remaining `view.ts` mutants are equivalent** (behavior-preserving), documented and
  intentionally not "killable" without asserting on unreachable states:
  - `view.ts:131` `while (step < points.length)` → `<= `: the extra iteration only ever
    reads `points[index ± points.length]`, which is always out of `[0, length-1]`, so it
    can never find a new match. Provably equivalent.
  - `view.ts:126` early-return guard `if (pointAtIndex && pointAtIndex.x === dateString)`
    (ConditionalExpression `false`) and its block (BlockStatement `{}`): removing the fast
    path falls through to the loop, whose `step === 0` iteration reads `points[index]` — the
    same element — and returns it. Provably equivalent.

  These 3 keep `view.ts` at a real ceiling of 98.08% total / 98.55% covered; chasing them
  would require asserting on states the code cannot reach.

### Phase 1.1 — `view.ts` saturated (commit: view tests)

- Added 15 tests to `src/utilities/view.test.ts` (10 → 25 unit tests total across the repo
  after this commit's file; suite green).
- Killed survivors via: self multiply/divide assignment ops; derived subtract/divide;
  derived "missing referenced layer returns value unchanged" (kills the `&&`→`||` and
  `if (matchingLayer && field)`→`true` mutants, which otherwise dereference `undefined`);
  unknown-transform-type guard (kills the `=== "derived"`→`true` else-if mutant);
  backward-scan `findMatchingPoint` (kills the `index - step` arithmetic and the left-match
  conditional); x-axis transform application (kills the `=== "x"` conditional/string and the
  `=== "y"`→`true` mutants); `formatYValue` boundary + high-precision + non-numeric-string
  assertions.
- Also filled the no-coverage regions per Phase 1.4: type guards, `createView`/`createViewPage`/
  `createViewPageGroup`/`createEntity`/`createDataLayer`, `duplicateEntity`/`duplicateSection`
  (new-UUID + layout-remap + source-immutability), and a `createView` JSON round-trip.
- `view.ts` mutation (file total): **42.79% → 98.08%** (covered 98.55%); no-coverage
  mutants 98 → 1; survivors 21 → 3 (all equivalent, above).

### Phase 1.4a — `product.ts` saturated (commit: product tests)

- New `src/utilities/product.test.ts` (10 tests). Killed both baseline `find`-predicate
  survivors and covered `getDatasetForLayer` (version + instrument match, instrument-override
  arg, no-product/no-match guards) and `applyFieldThresholds` (no-thresholds all-clear;
  lower/upper limit + warning violations with non-zero bounds; strict-boundary values;
  limits-absent and warnings-absent no-ops; `effective_since`/`effective_until` windows incl.
  exact-boundary dates; the D3 both-dates characterization).
- `product.ts` mutation (file total): **15.15% → 97.98%** (covered 97.98%); no-coverage
  0; survivors 10 → **2**, both proven equivalent:
  - `product.ts:72` `let inRange = false` → `true`: `inRange` is only read after the
    `since`/`until` branches assign it (or after the no-dates early-return), so its initial
    value can never be observed. Equivalent.
  - `product.ts:73` `if (threshold.effective_since)` → `if (true)`: for an `until`-only
    threshold the forced since-branch computes `undefined <= timestamp === false`, which the
    subsequent `until` branch overwrites; for a since-present threshold it is unchanged.
    Equivalent (and entangled with the D3 overwrite bug).

## Open questions for maintainers

- **Q1 (D1)**: Is the 200–400 success window in `api.ts` intentional (accepting 3xx)? Test
  will document current behavior; product behavior unchanged pending your call.
- **Q3 (D3)**: In `applyFieldThresholds`, when a threshold has both `effective_since` and
  `effective_until`, `effective_since` is currently ignored (overwritten). Intended logic is
  almost certainly `inRange = (since ? since <= ts : true) && (until ? until >= ts : true)`.
  Flagged only; not changed. Confirm before I fix (Phase 2 candidate).
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
- **Step 8 done (CI artifacts, no gating)**: in `.github/workflows/build.yml` `test_mango_ui`
  job — unit step now runs with `--coverage`, added a mutation step (`npm run test:mutation`),
  and added `upload-artifact` steps for `test-metrics/coverage/` and `test-metrics/mutation/`
  (retention 2 days per org limit). No thresholds/gating (that is Phase 5). Deploy job
  (`build_image`) and the commented-out e2e step left untouched.

### Phase 0 — EXIT

All 8 infra steps complete; no product code changed. Gates green (unit/lint/lint:css/build).
Metric deltas vs. §2 baseline: **none** on the meaningful scopes — `src/utilities/` coverage
33.45%, mutation 21.70% total / 83.92% covered, 117/3/23/410, 10 tests / 3 files. (Whole-app
statement % is 2.60% under the new `all:true` config vs. 3.26% config-less; de-emphasized per
§5, documented above.) Ready for Phase 1.
