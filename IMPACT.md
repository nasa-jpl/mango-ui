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

### Phase 1.4b — `generic.ts` saturated (commit: generic tests)

- Extended `src/utilities/generic.test.ts` (node env) with `getDataLayerId` channels branch,
  `convertHexToRGBA` (6-/3-digit, `#`-optional, fractional vs whole-number-percentage opacity
  incl. the `1` and `>100` boundaries, invalid→`#000000` catch), and `fetchWithProgress`
  (streamed chunks with progress/complete payload assertions, sub-200 & 3xx boundary rejects,
  non-2xx error, no-body `failure` event, rejected-fetch error, `cancel()` no-throw) using a
  mocked streaming `Response`.
- New `src/utilities/generic.dom.test.ts` (jsdom env) for `downloadJSON` (Blob content type +
  size, `createElement("a")`, click, object-URL create/revoke) and `isMacOs` (navigator
  platform true/false).
- `generic.ts` mutation (file total): **14.04% → 92.98%** (covered 92.98%); no-coverage 0;
  survivors 20 → **8**. The 8 residual survivors are all equivalent internal-state mutants in
  `fetchWithProgress` (L12/L13 initial `loading`/`chunks` values overwritten by `_resetLocals`;
  L21 `controller?.` optional chaining where `controller` is always set first; L28 the `|| ""`
  fallback only reachable on an empty body, where both variants still error; L37/L38/L85 the
  internal `loading` toggles in the read loop/finally; L94 the `cancel()` body whose
  `AbortController` effect isn't observable through the mocked stream). Not observable without
  asserting on private state.

### Phase 1.3 — `time.ts` saturated (commit: time tests + TZ fix)

- New `src/utilities/time.test.ts` (4 tests): `toDatetimelocalStr` truncation,
  `toUTCms` (UTC parse incl. documented `1646180940000` example + ISO round-trip), `j2ToMs`
  (multiple values + the 2000-01-01T12:00:00Z epoch), `formatDateGPS` (seconds-precision,
  zone-stripped).
- **Fixed a Phase 0.6 gap**: `test:mutation` was `stryker run` (no `TZ`), so Stryker and its
  spawned vitest workers ran in the host timezone. `formatDateGPS` (via
  `stellar-react`'s `formatDateISO`) formats in local time and `Intl` caches the default zone
  at process start, so a runtime `process.env.TZ` change in the setup file does **not** work —
  it must be set at process start. Changed the script to `TZ=UTC stryker run`. (This surfaced a
  real latent TZ dependency in `formatDateGPS`, now guarded.)
- `time.ts` mutation (file total): **0% → 88.89%**; no-coverage 0; survivors 1 —
  `time.ts:22` `value + "Z"` → `value + ""` in `toUTCms`. Equivalent under the pinned UTC
  timezone (with/without the `Z`, a zone-less datetime parses identically when the host is
  UTC); it is precisely the kind of bug the UTC pin exists to normalize.

### Phase 1.2 — `api.ts` saturated (commit: api tests)

- New `src/utilities/api.test.ts` (21 tests) with mocked `fetch` (`vi.stubGlobal`) and mocked
  `sonner` toast. Covers: `getView` headers/credentials/URL + success + `>400` throw+toast +
  sub-200 throw + the D1 3xx/400 characterization; `getMissions`/`getProducts` data + URL
  interpolation; `HttpError` shape; `getData` full + minimal URL construction, lazy
  fetch-until-`json()`, success parse, non-ok `HttpError` (detail / statusText fallback /
  non-JSON fallback), the ok-branch `status>=400` sub-block (detail + "Unknown error"),
  ok-branch parse failure, rejected fetch, and `cancel()` aborting the controller; `saveView`
  POST body/URL + success toast + `>400` throw + 400/sub-200 boundaries.
- **D1 flagged, not changed**: `getView`/`saveView` accept HTTP **200–400 inclusive** as
  success (3xx redirects and a bare 400 succeed). Characterization tests pin this; see Q1.
- `api.ts` mutation (file total): **0% → 98.37%** (covered 98.37%); no-coverage 6 → **0**;
  survivors 8 → **2**, both equivalent: `api.ts:89` `filter.length > 0` → `true` and → `>= 0`.
  Both only differ for an empty-but-present `filter` array, where `[].map(...).join("")` is
  `""`, i.e. no observable change to the query string.

### Phase 1 — EXIT

Exit criterion (§6 Phase 1.5): **utilities mutation score ≥ 85% total**. Achieved with wide
margin. No product code changed; three suspected defects flagged (D1/D3 open for maintainers,
D2 fixed as it was a missing assertion, not a code change).

| Scope (`src/utilities/`) | Mutation total              | Baseline (§2) | Stmt coverage | Baseline |
| ------------------------ | --------------------------- | ------------- | ------------- | -------- |
| **All utilities**        | **96.93%** (covered 97.10%) | 21.70%        | **100%**      | 33.45%   |
| `api.ts`                 | 98.37%                      | 0%            | 100%          | 0%       |
| `generic.ts`             | 92.98%                      | 14.04%        | 100%          | ~28%     |
| `product.ts`             | 97.98%                      | 15.15%        | 100%          | ~26%     |
| `time.ts`                | 88.89%                      | 0%            | 100%          | 0%       |
| `view.ts`                | 98.08%                      | 42.79%        | 100%          | ~61%     |

- Mutants: **530 killed / 6 timeout / 16 survived / 1 no-coverage** (was 117 / 3 / 23 / 410).
- Unit tests: **10 → 73** across **7** files. Suite runtime ~0.5s; mutation ~23s.
- The **16 residual survivors are all documented equivalent mutants** (view 3, generic 8,
  product 2, time 1, api 2) — see the per-file notes above; none is a real behavioral gap.
- All §8 gates green: `test:unit` (73), `lint`, `lint:css`, `build` (tsc strict).
- Whole-app statement coverage rose **2.60% → 7.96%**, function coverage → 54.5% (utilities
  fully covered). Per §5 this whole-app number stays de-emphasized; the headline is the
  scoped utilities mutation score.

## Phase 2 — Extract logic from components, then test it

### Phase 2.1 — `Chart.tsx` fetch-orchestration decisions extracted (commit: chart-data)

First PR-sized slice of `Chart.tsx` (1730 lines). Extracted the pure fetch-orchestration
decision logic buried inside the `fetchLayerData` Promise executor into a new React-/Chart.js-
free module `src/components/entities/chart/chart-data.ts`, then refactored `Chart.tsx` to call
it. The refactor is **behavior-preserving** (verbatim logic move; `build` + `lint` green, all
prior tests still pass).

- Extracted functions: `computeFetchWindow` (start/end resolution + one-day `windowBuffer`
  padding + duration), `computeDownsamplingFactor` (coarsest-resolution-that-keeps-≥1-point-
  per-pixel selection), `resolveFetchFields` (subset_version field/skip-downsampling decision),
  `isNotIngestedError` (4xx `HttpError` → not-ingested), `createNotIngestedDataResponse`.
- Removed now-dead inline blocks and the unused `HttpError` import from `Chart.tsx`.
- New `src/components/entities/chart/chart-data.test.ts` — **19 tests** characterizing current
  behavior, incl. boundaries: `windowBuffer === 0` (presence not truthiness), empty-string time
  fallback (`||` vs `&&`), strict `>`/`<` chart-width comparisons, last-resolution `nextPoints
== null` branch, subset_version dedupe + event-layer exclusion, and the 400/499/500/399
  `isNotIngestedError` edges.
- Added `chart-data.ts` to Stryker `mutate` scope (`stryker.config.json`).
- `chart-data.ts` mutation: **100.00%** (79 killed, 0 survived, 0 no-cov). The one initial
  survivor (`chart-data.ts:88` `nextPointsForDuration == null` → `false`, equivalent for any
  positive chart width) was killed with a legitimate zero-width characterization case, valid
  now that the function is a standalone pure unit.
- Aggregate mutated scope (utilities + chart-data): **96.93% → 97.31%** total
  (609 killed / 6 timeout / 16 survived / 1 no-cov). Unit tests **73 → 92** across **8** files.
  All §8 gates green (`test:unit`, `lint`, `lint:css`, `build`).

### Phase 2.2 — `Chart.tsx` per-entry point-derivation extracted (commit: deriveFieldPoints)

Second `Chart.tsx` slice. Extracted the per-data-entry point-derivation logic from the
`visualizeChartLayers` `processedData.map` (the downsampling min/max/avg → chart-point rules)
into `deriveFieldPoints` in `chart-data.ts`. Again **behavior-preserving**: the caller keeps
its `!fieldValue || typeof timestamp !== "string"` guard and its `pointsByField` key
creation, so the exact "empty vs absent field key" semantics are unchanged; only the ~55-line
point-building block moved (verbatim). `build` + `lint` green, all prior tests pass.

- `deriveFieldPoints(d, field, fieldMetadata, downsamplingFactor, nominalDataIntervalSeconds)`
  covers: no-downsampling raw point; downsampled min+max → midpoint min (+max when they
  differ); avg-only → raw-timestamp avg point; and the empty cases (no metadata, unusable
  aggregations, invalid field/timestamp).
- Uses a type-only `import type { CustomChartData } from "./Chart"` (no runtime cycle; no
  `import/no-cycle` rule configured). Note: the workspace's format-on-save import-cleaner
  strips not-yet-used imports between edits — add imports and their first use in the _same_
  edit to avoid a transient removal.
- New tests: **19 → 27** in `chart-data.test.ts`, incl. midpoint arithmetic (`nominal/2*1000`,
  `+` offset, null-interval → timestamp), `min !== max` dedupe, and symmetric min-only/max-only
  cases that prove the min/max branch requires **both** aggregations.
- `chart-data.ts` mutation: **100.00%** (136 killed, 0 survived). Two initial survivors on the
  `type === "min"` predicate were killed by the "max-only aggregations" characterization case.
- Aggregate mutated scope: **97.31% → 97.53%** (666 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **92 → 100** across **8** files. All §8 gates green.

### Phase 2.3 — `Chart.tsx` subset_version layer expansion extracted (commit: expandLayerBySubsetVersion)

Third `Chart.tsx` slice. Extracted the `processedData.flatMap` block that splits a line layer
carrying `subset_version` data into one alternating-colored virtual layer per version into
`expandLayerBySubsetVersion(item)` (+ exported `ProcessedLayerData` type) in `chart-data.ts`.
The 60-line body moved verbatim; `Chart.tsx` now calls `processedData.flatMap(expandLayerBySubsetVersion)`.
**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **27 → 34** in `chart-data.test.ts` — non-line/no-data/no-version passthrough,
  numeric-sorted alternating blue/red virtual layers, `some` (not `every`) presence, `unknown`
  fallback, spread preservation of other fields/metadata, and 3-group color alternation.
- `chart-data.ts` mutation: **100.00%** (187 killed, 0 survived). Six initial survivors were
  killed after two insights worth recording:
  - The `.sort` survived because `Object.entries` **auto-numeric-sorts integer-like string
    keys**, making the explicit sort redundant for `"2"`/`"10"`; switching the test to
    non-integer keys (`"v2"`/`"v10"`) — where `Object.entries` preserves insertion order —
    exercises the real sort and kills both `.sort`-removal and comparator mutants.
  - The line-layer guard and `some`/optional-chaining mutants needed items that would _actually
    expand_ (event layer with subset_version data; a mix of points with and without a version).
- Aggregate mutated scope: **97.53% → 97.70%** (717 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **100 → 107** across **8** files. All §8 gates green.

### Phase 2.4 — `Chart.tsx` subset_version counting extracted (commit: countUniqueSubsetVersions)

Fourth `Chart.tsx` slice. Extracted the "count unique subset_versions in the data" block from
the Chart.js dataset builder into `countUniqueSubsetVersions(points)` in `chart-data.ts`
(coerces each value to a string, ignores `null`/`undefined`, returns 0 for no points).
`Chart.tsx` now calls it with `pointsByField[layer.fields[0]]`. **Behavior-preserving**:
`build` + `lint` green, all prior tests pass.

- New tests: **34 → 40** in `chart-data.test.ts` — undefined/empty → 0, no-version → 0,
  distinct-vs-duplicate counting, null/undefined excluded while `0` still counts, all-null → 0,
  and string coercion (`2` and `"2"` collapse to one).
- `chart-data.ts` mutation: **100.00%** (201 killed, 0 survived) on the first run — the
  falsy-`0` and all-null cases pre-empted the usual `!== null`/`!== undefined` survivors.
- Aggregate mutated scope: **97.70% → 97.75%** (731 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **107 → 113** across **8** files. All §8 gates green.

### Phase 2.5a — `EntityEditor.tsx` pure helpers extracted (commit: entity-editor-utils)

First `EntityEditor.tsx` slice. The component (1051 lines) is almost entirely JSX + stateful
handlers; its only cleanly-testable logic is three pure module-level helpers, extracted verbatim
into a new `src/components/ui/entity-editor-utils.ts` (added to the Stryker `mutate` scope):

- `getLabelForSelectedProductOrLayer(thing, fields?)` — canonical label / equality key builder.
- `getMatchingSelectedProductForLayer(layer, selectedProducts, fields?)` — label-equality `.find`.
- `extractEntitySelectedProducts(entity)` — maps layers → selected products (fresh `generateUUID`).

`SelectedProduct` stays defined in (and exported from) `EntityEditor.tsx` because
`ProductsSelector.tsx` / `ProductSelector.tsx` import it from there; the utils file uses a
type-only `import type { SelectedProduct }` (erased, no runtime cycle). `EntityEditor.tsx` now
imports all three back (incl. `getLabelForSelectedProductOrLayer`, still used directly at ~L981 —
`tsc` build caught the missing import that vitest/Stryker's transform did not).

- New tests: **11** in `entity-editor-utils.test.ts` (9 test files total). Cover full label with
  channels+filter, empty/absent channel & filter segments, multi-channel space separator, the
  `fields` override on both label sides, matching + no-match, id generation, filter-only-when-array,
  and no-layers → `[]`.
- `entity-editor-utils.ts` mutation: **100.00%** (39 killed, 0 survived). Notes:
  - Removed a **provably-dead `?.`** (`(thing.channels || [])?.map` — `x || []` is never nullish),
    an otherwise-equivalent mutant, as a behavior-preserving cleanup.
  - The product-side `fields || p.fields` survivors needed a test where `p.fields` **differs** from
    the override (otherwise `false`/`&&` mutants coincide with the original).
- Aggregate mutated scope: **97.75% → 97.86%** (770 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **113 → 124** across **9** files. All §8 gates green.

### Phase 2.5b — `ProductSelector.tsx` completeness gate extracted (commit: isSelectedProductComplete)

Second `EntityEditor`-area slice. Extracted the `updateSelectedProduct` completeness guard
(`mission && instrument && dataset && fields.length && version`) from `ProductSelector.tsx` into
`isSelectedProductComplete(product)` in the shared `entity-editor-utils.ts`. The call site is now
`if (isSelectedProductComplete(updatedSelectedProduct))`. Wrapped in `Boolean(...)` so the return
is a true boolean — behaviorally identical inside the `if`. `build` + `lint` green.

- New tests: **2** (all-present → true; a single-missing case per field → false) — 13 in the file.
- `entity-editor-utils.ts` mutation: **100.00%** (49 killed, 0 survived). The five single-missing
  cases kill every `&&`→`||` mutant (turning any `&&` into `||` lets a truthy neighbor through in
  at least one case).
- Recurring tooling note (again): the formatter stripped the test's not-yet-used
  `isSelectedProductComplete` import between edits; re-added after the usages existed.
- Aggregate mutated scope: **97.86% → 97.88%** (780 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **124 → 126** across **9** files. All §8 gates green.

### Phase 2.6 — `ProductSelector.tsx` subset_version count derivation extracted (commit: countSubsetVersionsInDataResponse)

Third `EntityEditor`-area slice. Extracted the `Set`-building block from `ProductSelector.tsx`'s
fetch `useEffect` into `countSubsetVersionsInDataResponse(data)` in `entity-editor-utils.ts`
(guards a missing/malformed response, coerces values to strings, ignores `null`/`undefined`).
The call site is now `const count = countSubsetVersionsInDataResponse(await json())`.
**Behavior-preserving**: `data && data.data && Array.isArray(data.data)` collapses to
`data && Array.isArray(data.data)` (`Array.isArray` already implies a truthy array), and the
`if (count > 0)` update path is unchanged. Also dropped the now-unused `DataResponseDataEntry`
import from `ProductSelector.tsx`.

- New tests: **6** in `entity-editor-utils.test.ts` (19 in file) — null/undefined/malformed → 0,
  empty/no-version → 0, distinct-vs-duplicate, null/undefined excluded while `0` counts, all-null → 0,
  string coercion.
- `entity-editor-utils.ts` mutation: **100.00%** (64 killed, 0 survived) first run.
- Recurring tooling note (again): the formatter stripped the not-yet-used `DataResponse` import in
  the source (added in a separate edit from the function) — `tsc` build caught it (`TS2552` +
  implicit-any on `point`); re-added once the function referenced it. Reinforces adding imports and
  first use in the **same** edit.
- Aggregate mutated scope: **97.88% → 97.92%** (795 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **126 → 132** across **9** files. All §8 gates green.

### Phase 2.7 — `ProductSelector.tsx` fetch-guard predicate extracted (commit: shouldFetchSubsetVersionCount)

Fourth `EntityEditor`-area slice. Extracted the fetch `useEffect`'s early-return guard from
`ProductSelector.tsx` into `shouldFetchSubsetVersionCount(product, hasSubsetVersionField, dateRange)`
in `entity-editor-utils.ts` — the positive form (all of: has-field, mission, instrument, dataset,
version, date range). The call site is now `if (!shouldFetchSubsetVersionCount(...)) return;`.
**Behavior-preserving** (De Morgan of the original `|| return`).

- Trade-off: extracting the guard removed TS's control-flow narrowing of `dateRange`, so the two
  `getData(... dateRange.start, dateRange.end)` reads now use `dateRange!` (the predicate proves
  it's defined). A commented non-null assertion is the minimal fix; the alternative (a `dateRange`
  type-guard) can't narrow a single param when the predicate also checks the product.
- New tests: **4** in `entity-editor-utils.test.ts` (23 in file) — all-complete → true; missing
  field-flag (false/undefined) → false; each missing selection field → false; no date range → false.
- `entity-editor-utils.ts` mutation: **100.00%** (76 killed, 0 survived) first run.
- Aggregate mutated scope: **97.92% → 97.95%** (807 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **132 → 136** across **9** files. All §8 gates green.

### Phase 2.8 — `Table.tsx` pure formatters/mappers extracted (commit: table-utils)

First `Table.tsx` slice. Extracted four pure helpers from the ag-grid column config into a new
`src/components/entities/table/table-utils.ts` (added to the Stryker `mutate` scope):

- `getAGGridFilterType(type)` — field type → ag-grid floating-filter type.
- `getFieldDisplayValue(fieldData)` — cell display value (`value` → `avg` → `min – max` range).
- `formatTableCellValue(value, type, dateFormat)` — data column `valueFormatter` core.
- `formatTimestampValue(value, collapseByDay)` — derived timestamp column `valueFormatter`.

`Table.tsx`'s `valueFormatter`/`valueGetter` arrows now delegate to these. **Behavior-preserving**:
`build` + `lint` green, all prior tests pass.

- New tests: **12** in `table-utils.test.ts` (10 test files total) — every filter-type branch incl.
  unknown → `true`; value/avg/min–max precedence and the undefined/partial-range cases; datetime
  short vs full, non-datetime guard, empty → `-`, passthrough; and both timestamp branches.
- `table-utils.ts` mutation: **100.00%** (66 killed, 0 survived). Two initial survivors were
  **equivalent mutants**: emptying `case "int"` fell through to `case "float"` (identical return),
  same for `case "str"`→`case "bool"`. Fixed by **grouping the fallthrough cases**
  (`case "int": case "float": return …`), an idiomatic simplification that makes each group's
  single return killable.
- Aggregate mutated scope: **97.95% → 98.10%** (873 killed / 6 timeout / 16 survived / 1 no-cov).
  Unit tests **136 → 148** across **10** files. All §8 gates green.

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
