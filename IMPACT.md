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

### Phase 2.9 — `Table.tsx` row threshold-status derivation extracted (commit: deriveRowTrippedStatus)

Second `Table.tsx` slice. Extracted the derived-column `cellRenderer`'s tripped-status loop into
`deriveRowTrippedStatus(rowData, columns)` in `table-utils.ts` — scans a row's columns and returns
`"error"` (any limit tripped) → `"warning"` (any warning tripped) → `"nominal"`, skipping columns
without computed thresholds. The `cellRenderer` now calls it and renders the `StatusBadge`.
**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **8** in `table-utils.test.ts` (20 in file) — empty-columns/null/undefined row →
  nominal; absent layer/field skip; missing cell / no `_thresholds` skip; thresholds-present-but-
  untripped → nominal; limit lower/upper → error; warning-only lower/upper → warning; limit-over-
  warning precedence; and continue-past-skip to a later tripped column.
- `table-utils.ts` mutation: **100.00%** (97 killed + 1 timeout, 0 survived).
- Cleanup that killed 3 initial survivors (all **equivalent mutants**): removed a **redundant early
  `continue`** (`if (!limits.lower && !limits.upper && !warnings.lower && !warnings.upper) continue;`).
  When all four flags are false, skipping vs. falling through both yield `"nominal"` (the two later
  `if`s are false), so the skip was dead — it only spawned equivalent mutants and forced the
  `warnings.lower || warnings.upper` check to be always-true when reached. Same pattern as 2.8's
  fallthrough-case grouping: delete provably-dead code rather than chase equivalent mutants.
- Recurring tooling note (again): the four type-only imports (`ComputedThresholds`,
  `ProcessedDataResponseDataEntry`, `Status`, `TableColumn`) were stripped because I added them in a
  **separate** edit from `deriveRowTrippedStatus`; `tsc` build caught it (`TS2552`/`TS2304`). Re-added
  once the function referenced them. (When possible, add import + first use in one `multi_edit`.)
- Aggregate mutated scope: **98.10% → 98.17%** (904 killed / 7 timeout / 16 survived / 1 no-cov).
  Unit tests **148 → 156** across **10** files. All §8 gates green.

### Phase 2.10 — `Table.tsx` row-class de-dup + tooltip builder extracted (commit: threshold-tooltip+row-class)

Third `Table.tsx` slice. Two extractions into `table-utils.ts`:

- `getRowThresholdClass(status)` — maps a `Status` to the ag-grid row class (`error`→`limit-row`,
  `warning`→`warning-row`, else `""`). The `gridProps.getRowClass` loop was a **near-verbatim
  duplicate** of `deriveRowTrippedStatus` (same scan + the same redundant early-`continue` removed in
  2.9), so `getRowClass` now reuses `deriveRowTrippedStatus` + this mapper — deleting ~35 lines of
  duplicated logic.
- `buildThresholdTooltip(label, limits, warnings)` — builds the multi-line cell tooltip string used
  by `tooltipValueGetter` from `applyFieldThresholds`' `ComputedThresholds`.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **3** in `table-utils.test.ts` (23 in file) — row-class for error/warning/nominal + a
  non-error/warning status (`loading`) → `""`; tooltip with all values present (each on its own line)
  and with all values null → dash per line (kills every `?? "-"` and each string-literal segment).
- `table-utils.ts` mutation: **100.00%** (125 killed + 1 timeout, 0 survived).
- Recurring tooling note (3rd time): the two new import names (`buildThresholdTooltip`,
  `getRowThresholdClass`) were **auto-stripped from the _test_ file's import block** between edits
  (they were briefly unused), causing `ReferenceError`/`TS2304`. Re-added once the test bodies
  referenced them. Lesson reinforced: add an import and its first use within a single edit.
- Aggregate mutated scope: **98.17% → 98.22%** (932 killed / 7 timeout / 16 survived / 1 no-cov).
  Unit tests **156 → 159** across **10** files. All §8 gates green.

### Phase 2.11 — `Map.tsx` downsampling logic extracted (commit: map-utils)

Pivoted from `CustomFilter.tsx` — **it has no extractable logic** (28-line presentational component:
a single `onColumnPreview &&` render guard around a `<Button>`; nothing for Stryker to target under
our unit strategy). Went to `Map.tsx` instead. Extracted two pure helpers into a new
`src/components/entities/map/map-utils.ts` (added to the Stryker `mutate` scope):

- `getDurationSeconds(startTime, endTime)` — ISO span in seconds.
- `computeDownsamplingFactor(resolutions, durationSeconds, maxPointNumber)` — the resolution-picking
  loop (finest resolution under the point cap, else coarsest). `fetchLayerData` now calls both;
  `product?.available_resolutions ?? []` replaces the old `if (product)` guard.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **8** in `map-utils.test.ts` (11 test files total) — duration positive/reversed;
  factor for empty resolutions → 1, finest-under-cap, skip-until-fits, coarsest fallback, lone
  resolution, and an exact-cap boundary.
- `map-utils.ts` mutation: **100.00%** (20 killed, 0 survived).
- Two survivors fixed before green:
  - **Equivalent mutant** (`/`→`*` in the next-resolution point estimate): `nextPointsForDuration`
    was only ever null-checked, never used numerically, so its magnitude was dead. Replaced the whole
    computation with `nextResolution == null` — behavior-identical, simpler, and no dead arithmetic to
    mutate. (Same "delete dead code" theme as 2.8–2.10.)
  - **Boundary gap** (`<`→`<=` on the point cap): added a test where a resolution yields _exactly_
    the cap (1000/10 = 100 points) and must be skipped, pinning the strict `<`.
- Aggregate mutated scope: **98.22% → 98.26%** (952 killed / 7 timeout / 16 survived / 1 no-cov).
  Unit tests **159 → 167** across **11** files. All §8 gates green.

### Phase 2.12 — `Map.tsx` point extraction added (commit: extractMapPoints)

Second `Map.tsx` slice. Extracted the layer-results → plottable-points flattening from
`visualizeMapLayers` into `extractMapPoints(results)` in `map-utils.ts`; also moved the `Location`
type there (it was declared in `Map.tsx` but imported nowhere else). Returns
`{ downsampling, points }` — `downsampling` is the last result's factor (drives point vs. polyline
render), `points` are lat/lng pairs with location-less entries skipped.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **4** in `map-utils.test.ts` (12 in file) — empty results → `{1, []}`; collect points +
  downsampling factor; skip missing/null locations; accumulate across results keeping the last factor.
- `map-utils.ts` mutation: **100.00%** (30 killed, 0 survived) — first run clean.
- Recurring tooling note (4th/5th time this task): the `DataResponse` type import (in the _source_)
  and `extractMapPoints` (in the _test_) were each auto-stripped when added a step before their first
  use; `tsc` caught both (`TS2552`/`TS2304`). Re-added. This quirk is now consistent enough that the
  reliable workaround is: **never add an import in a separate edit from its first usage.**
- Aggregate mutated scope: **98.26% → 98.28%** (962 killed / 7 timeout / 16 survived / 1 no-cov).
  Unit tests **167 → 171** across **11** files. All §8 gates green.

### Phase 2.13 — chart pure helpers extracted (commit: toDimension + tooltip position)

Scanned the remaining `entities/` components and found `Timeline.tsx` (only a trivial `left+150 > width`
flip flag), `TimelineRow.tsx`, `Text.tsx` — nothing worth extracting. The real targets were in the
chart pair:

- `toDimension(value, dimension)` — parses an absolute number or `"%"` string relative to a dimension.
  Was a module-level (non-exported, untested) helper in `Chart.tsx`; moved into `chart-data.ts` and
  imported back. Used once (linear-scale `grace`).
- `computeTooltipLeft(...)` / `computeTooltipTop(...)` — the tooltip's viewport-clamped `left` and
  above-caret `top` math, previously inline in `ChartTooltip.tsx`'s style object (window-dependent, so
  effectively untestable in place). Now pure functions taking `innerWidth`/`scrollX`/`scrollY` as
  args; `ChartTooltip.tsx` passes `window.*`. The confusing `- -tooltip.caretY` double-negative is now
  a plain `+ caretY`.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **5** in `chart-data.test.ts` (45 in file) — percentage vs. absolute dimension; tooltip
  left both fitting and clamped-to-edge; tooltip top with a positive and a negative result.
- `chart-data.ts` mutation: **100.00%** (201 → **226** killed, 0 survived) — first run clean.
- Recurring tooling note (6th time): the `chart-data` import in `ChartTooltip.tsx` was auto-stripped
  in the gap between adding it and adding its usage (`TS2304`). Re-added. For the test file I avoided
  this by adding imports + tests in a **single** `multi_edit`.
- Aggregate mutated scope: **98.28% → 98.32%** (987 killed / 7 timeout / 16 survived / 1 no-cov).
  Unit tests **171 → 176** across **11** files. All §8 gates green.

### Phase 2.14 — `components/page/` section transforms extracted (commit: page transforms)

Scanned `components/page/`: `Entity.tsx` is pure entity-type dispatch, `EntityHeader.tsx`/
`CustomGridItem.tsx` are presentational. `ViewPage.tsx`'s handlers hold the real logic, wrapped in
`if (!viewPage) return` guards, `confirm()` dialogs, and `onPageChange` side effects. Extracted the two
**clearly-correct** section-level cores into `utilities/view.ts` (already tested + in Stryker scope),
mirroring the existing `duplicateEntity(entity, section): Section` shape:

- `removeEntityFromSection(section, entityId)` — the subtle bit: it splices the layout entry by the
  entity's **array index** (not by matching `layout.i`), replacing the inline block in `onEntityDelete`.
- `replaceEntityInSection(section, entity)` — id-matched swap, replacing the inline block in `onEntitySave`.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **4** in `view.test.ts` — remove by index leaving others + source-not-mutated; remove with
  absent id (no-op); replace matching (identity-checked) + non-match no-op.
- Both new functions: **100%** mutation (no survivors in lines 304–332), first run clean.
- **Bonus**: while here, closed the last **no-coverage** mutant in `view.ts` — `findMatchingPoint`'s
  `dateString = ""` default param (added a test calling it without the arg). The 3 remaining `view.ts`
  survivors (126:7, 126:54, 131:10) are **equivalent mutants**: the fast-path `return points[index]`
  duplicates loop step 0 (`points[index - 0]`), and `step < length` → `<=` only adds a harmless extra
  iteration — neither is observable. Left as-is.
- `view.ts` mutation: **98.21% → 98.66%** (215 → **218** killed, 0 no-cov, 3 equivalent survivors).
- Aggregate mutated scope: **98.32% → 98.44%** (1004 killed / 7 timeout / 16 survived / **0 no-cov**).
  Unit tests **176 → 181** across **11** files. All §8 gates green.

### Phase 2.15 — `components/ui/` date-range validation extracted (commit: date-range-utils)

Moved into `ui/`. `EntityHeader`/`Page`/`Tabs`/`Tooltip`/`StatusBadge` are presentational; `EntityEditor`
is already served by `entity-editor-utils.ts`. The rich target was `DateRangePicker.tsx`'s
`handleDateRangePickerEvent` — a branchy error-string ladder (required / invalid / out-of-range /
counterpart-invalid / start-after-end / valid). Extracted the pure core into new
`src/components/ui/date-range-utils.ts` as `validateDateRangeInput(...)`, returning a discriminated
union `{ valid: false; error } | { valid: true; startDate; endDate }`; the component keeps only the
`setState`/`onChange` side effects. Added to the Stryker `mutate` scope.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **12** in `date-range-utils.test.ts` (new 12th test file) — every error branch (both
  `from`/`to` verbs), min/max out-of-range, counterpart-invalid for both verbs, start-after-end,
  valid resolution for `from` and `to`, and short (date-only) format.
- `date-range-utils.ts` mutation: **89.74%** (70 killed, **8 survived**, 0 no-cov).
- The 8 survivors are **equivalent mutants under the project-mandated `TZ=UTC`** (`package.json`
  `test:unit`/`test:mutation` both set `TZ=UTC`):
  - `parseAsUtc` `Z`-handling (`endsWith("Z")`, the `+ "Z"` append) — appending/omitting `Z` yields the
    same UTC instant under UTC; the branch only matters for non-UTC clients (its stated purpose:
    "otherwise 7 hours will be added"), which can't be exercised in-suite without changing `TZ`.
  - the short-format `+= "T00:00:00"` append — redundant because `parseDateStringISO` parses a
    date-only string (with `Z`) to the same midnight the append would produce.
    Both blocks are faithful to the original component and serve real production paths, so I did **not**
    delete them to inflate the score. Killed the one genuinely-observable survivor (`eventVerb` `"end"`
    literal) with an "invalid edited date while editing `to`" test.
- Design tweak vs. the original: replaced the empty-string-error discriminant with an explicit
  `valid` boolean tag so TS narrows the success branch (an `error: ""` union does not narrow).
- Aggregate mutated scope: **98.44% → 97.83%** (1074 killed / 7 timeout / **24 survived** / 0 no-cov).
  The percentage dips because this slice adds 70 killed **and** 8 honest equivalent survivors to the
  denominator (survived 16 → 24); net killed rose 1004 → 1074. Unit tests **181 → 193** across **12**
  files. All §8 gates green.

### Phase 2.16 — `DataGrid` filter-text rendering extracted (commit: data-grid-utils)

`DataGrid.tsx`'s `getFilterDisplayText` — a pure, recursive ag-grid filter-model → display-string
mapper (13-case `switch` for comparison/text/blank types + an AND/OR combined branch that recurses).
Moved verbatim into new `src/components/ui/DataGrid/data-grid-utils.ts` (added to Stryker scope); the
component keeps calling it from `updateActiveFilters`.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **8** in `data-grid-utils.test.ts` (13th test file) — nullish model; all six numeric
  comparisons; `inRange` (both bounds); the four quoted string-match types; blank/notBlank; unknown
  type falling back to the raw value and to `""`; and AND/OR combination with uppercased operator.
- `data-grid-utils.ts` mutation: **100.00%** (51 killed, 0 survived).
- One survivor fixed before green: `let text = ""` → the initializer is **dead** (every `switch` path,
  including `default`, reassigns `text`), so the mutant was equivalent. Changed to `let text: string;`
  (TS definite-assignment is satisfied via the exhaustive `default`), eliminating the dead code and the
  mutant. (Same "delete dead code" theme as 2.8–2.11.)
- Aggregate mutated scope: **97.83% → 97.92%** (1125 killed / 7 timeout / 24 survived / 0 no-cov).
  Unit tests **193 → 201** across **13** files. All §8 gates green.

### Phase 2.17 — `EntityEditor` product-splitting extracted (commit: split-products)

Following the "close out Phase 2" survey, took the strongest remaining pure-logic candidate:
`EntityEditor.tsx`'s `handleEntityTypeChange` splits multi-field selected products into one product
per field when switching an entity away from `table`. Extracted that array transform into
`splitSelectedProductsByField(selectedProducts): SelectedProduct[]` in the existing
`entity-editor-utils.ts` (already in Stryker scope); the handler keeps only the `setSelectedProducts`/
`createEntity` side effects and the `type === "table"` guard.

**Behavior-preserving**: `build` + `lint` green, all prior tests pass.

- New tests: **4** in `entity-editor-utils.test.ts` (27 in file) — multi-field split; property
  preservation + fresh distinct ids; order-preserving flatten across products; empty input and
  no-fields product both yielding `[]`.
- `entity-editor-utils.ts` mutation: **100.00%** (82 killed, 0 survived) — clean on first run.
- Aggregate mutated scope: **97.92% → 97.93%** (1131 killed / 7 timeout / 24 survived / 0 no-cov).
  Unit tests **201 → 205** across **13** files. All §8 gates green.

### Phase 2 close-out survey (for maintainers)

Ran a codebase-wide scan for remaining high-value extraction targets. Finding: the easily-testable
pure logic has largely been extracted into the 11 Stryker-scoped util modules; the remaining component
code is increasingly **imperative/side-effect-bound** (chart.js instance manipulation, async API
orchestration, React state mutation). Prioritized remainder:

- **Tier 1 — flagged correctness bugs (highest value):** resolve Q1 (`api.ts` 3xx window), Q3
  (`applyFieldThresholds` ignores `effective_since`), Q4 (`ViewPage.onAddEntity` layout duplication),
  and **new Q5** below. Each is a small fix + regression test pending a maintainer decision.
- **Tier 2 — genuine pure logic still worth extracting:** `Table.buildTableColumns` (column-def
  assembly); `DownlinkDashboard` dataset-status derivation (small, and see Q5).
- **Tier 3 — low ROI, recommend skipping:** `Chart.tsx` zoom/axis helpers (chart.js-bound),
  `ProductSelector` (logic inlined in JSX), async fetchers, modals/sidebar (presentational).

## Phase 3 — Component tests (React Testing Library + user-event)

Scope per §6: **selective** component tests for interaction/wiring that pure-logic unit tests
cannot reach — rendered DOM, controlled inputs, async success/error branches, callback contracts.
Components (`.tsx`) remain **out** of the Stryker `mutate` scope (§5 anti-gaming); these are
behavioral tests, not mutation-scored. Harness (Phase 0.2): jsdom opt-in per file via
`// @vitest-environment jsdom`, `@testing-library/react` + `user-event`, jest-dom matchers from
`src/test-utils/setup.ts`. Note: RTL auto-cleanup is **not** globally registered (setup.ts stays
node-safe for pure tests), so component test files call `cleanup()` in `afterEach` explicitly.

### Phase 3.1 — `SaveViewModal.tsx` (commit: SaveViewModal component test)

First component test. `SaveViewModal` is a self-contained Radix `Dialog` form with a real branch
set and one mockable dependency (`saveView` from `utilities/api`). New
`src/components/app/SaveViewModal.test.tsx` (**8 tests**, jsdom) covering: closed → nothing
rendered; open → dialog shown with Save disabled; incorrect password keeps Save disabled;
correct password (case-insensitive) enables Save; click-Save success path calls
`saveView(view)` → `onSave(view)` → `onClose`; Enter-key submit; save-failure path shows the
error message and calls **neither** `onSave` nor `onClose`; Cancel closes without saving.
`saveView` mocked via `vi.mock`.

- Unit+component tests **205 → 213** across **14** files (1 new `.tsx` file). All §8 gates green
  (`test:unit` under `TZ=UTC`, `lint`, `lint:css`, `build`). Mutation scope/score unchanged
  (no `.tsx` added to Stryker).
- **New Q6 (security, see below)** surfaced while reading the component.

### Phase 3.2 — `AlertDialogProvider.tsx` (commit: AlertDialogProvider tests)

The app-wide `alert`/`confirm`/`prompt` primitive (Radix `AlertDialog` + a context/reducer +
`useConfirm`/`usePrompt`/`useAlert` hooks). New `src/components/ui/AlertDialogProvider.test.tsx`
(**11 tests**) in two layers:

- **Pure reducer (`alertDialogReducer`), 5 tests:** `close` flips only `open`; `alert` opens with
  the `"Okay"` cancel default + `outline` variant; `confirm` defaults cancel to `"Cancel"` and
  preserves custom labels/variants; `prompt` carries `defaultValue`/`title`; unknown action returns
  the same state reference. (The reducer is genuinely pure but lives in a `.tsx`, so it is unit-
  tested but **not** added to the Stryker `mutate` scope per §5.)
- **Provider behavior via a test consumer (jsdom), 6 tests:** `confirm` resolves `true` on the
  action button and `false` on cancel; custom action/cancel labels render and work; `prompt`
  renders a pre-filled, editable input and its submit resolves the promise; `prompt` cancel resolves
  `false`; `alert` shows only a single dismiss button (no submit) and resolves `false`.
- **Environment note (not a bug):** the `prompt` submit reads its value via the legacy
  `event.currentTarget.prompt` named-form-control getter, which **jsdom does not implement**
  (the input _is_ form-associated — `input.form` is non-null — but `form.<name>` access returns
  `undefined`). So the exact returned-string round-trip is asserted at the browser/E2E layer
  (Phase 4), not here. Verified real DOM association in-test before concluding this is a jsdom gap.
- Unit+component tests **213 → 224** across **15** files. All §8 gates green. Mutation scope/score
  unchanged.

### Phase 3.3 — `ProductsSelector.tsx` + `ProductSelector.tsx` (commit: product selector tests)

The product-picker pair used by `EntityEditor`. Two new test files:

- **`ProductsSelector.test.tsx` (9 tests)** — the list orchestrator. Its own logic is pure
  array-transform button handlers, so the child `ProductSelector` (Radix-`Select`-heavy) and
  `Tooltip` (needs a provider) are **mocked/stubbed** to isolate it. Covers: renders one child per
  product + an Add button; **Add Product** appends a blank product with a fresh `generateUUID` id;
  **Delete** removes the product; **Duplicate** inserts a copy after the original with a new id;
  **Filter toggle** adds `filter: []` when absent and deletes the `filter` key when present; and the
  **subset-version badge** singular/plural/absent rendering.
- **`ProductSelector.test.tsx` (5 tests)** — the single-product form. The mission/instrument/
  dataset/version dropdowns are Radix `Select` (option lists are trivial dedup/filter derivations)
  and the field picker is a cmdk `Command`; both are pointer-capture/portal-bound and **deferred to
  the E2E layer (Phase 4)**. The component-only logic that _is_ robustly testable — the **Filter
  input** — is covered: renders only when `filter` is an array; pre-fills from the array;
  parses `"a=1, b=2"` → `["a=1","b=2"]`; trims whitespace and drops empty segments; and, critically,
  **only emits `onChange` when the product is complete** (`isSelectedProductComplete` gate — verified
  no emission for an incomplete product). `getData` mocked (subset effect gated off).
- Unit+component tests **224 → 238** across **17** files. All §8 gates green (`tsc` build caught a
  `beforeEach` return-type slip, fixed). Mutation scope/score unchanged (no `.tsx` in Stryker).

### Phase 3.4 — `Sidebar.tsx` (commit: Sidebar component test)

App navigation shell (`react-router` `NavLink`s + page-group tree + save-view control). New
`src/components/app/Sidebar/Sidebar.test.tsx` (**6 tests**), rendered inside a `MemoryRouter`;
`saveView` (pulled in transitively via the embedded `SaveViewModal`) is mocked. Covers: the
**Loading** placeholder + static nav links (Home/Products/Manage/Help) when `view` is undefined;
**page-group/page rendering** with correct resolved `href` (`/view/{group.url}/{page.url}`);
**`viewSavingEnabled` true** shows the "Save View Changes" button (and hides "View up-to-date");
**`viewSavingEnabled` false** shows the disabled "View up-to-date" button (and hides Save);
clicking "Save View Changes" **opens the embedded `SaveViewModal`** (password field appears);
and the **Help** link points at `config.endpoints.docs` with `target="_blank"`.

- Unit+component tests **238 → 244** across **18** files. All §8 gates green. Mutation scope/score
  unchanged.

### Phase 3.5 — `EntityEditor.tsx` (commit: EntityEditor component test)

The ~1000-line entity configuration form. Its heavy dependencies are stubbed to isolate its own
form wiring: the live `Entity` preview (Chart.js/Cesium/ag-grid), the `ProductsSelector` child,
`InputForm`, and `Tooltip` (provider-bound) are mocked; `ResizeObserver` is polyfilled (used by
`useResizeObserver`). New `src/components/ui/EntityEditor.test.tsx` (**5 tests**): renders the
"Edit Entity" header with Done/Discard and the **title pre-filled** from `entity.title`;
**Discard Changes → `onCancel`**; **Done → `onSave`** with the current entity; **editing the title
is reflected in the saved entity** (edit → Done → `onSave` carries the new title); and the tab
gating (**Products enabled**, **Events/Transformations disabled**). The entity-type Radix `Select`
and the per-layer/column Radix sub-forms are portal/pointer-bound and **deferred to E2E (Phase 4)**;
their pure extraction (`splitSelectedProductsByField`, `extractEntitySelectedProducts`, etc.) is
already 100% mutation-tested in `entity-editor-utils`.

- Unit+component tests **244 → 249** across **19** files. All §8 gates green (`lint` caught a
  `member-ordering` slip in the RO stub, fixed). Mutation scope/score unchanged.

### Phase 3 — EXIT

Selective component tests complete for the §6 target set. **6 new test files, 44 new tests**
(baseline unit suite **205 → 249**, files **13 → 19**):

| Phase | Component                                      | Tests |
| ----- | ---------------------------------------------- | ----- |
| 3.1   | `SaveViewModal`                                | 8     |
| 3.2   | `AlertDialogProvider` (reducer + provider)     | 11    |
| 3.3   | `ProductsSelector` (9) + `ProductSelector` (5) | 14    |
| 3.4   | `Sidebar`                                      | 6     |
| 3.5   | `EntityEditor`                                 | 5     |

Standing decisions held throughout: **no `.tsx` added to the Stryker `mutate` scope** (§5 anti-
gaming — components are behavior-tested, not mutation-scored); heavy/portal/pointer-capture-bound
Radix widgets (`Select`, cmdk `Command`, calendar `DateRangePicker`) and the jsdom named-form-control
gap are **explicitly deferred to the E2E layer (Phase 4)** rather than asserted flakily. All §8 gates
(`test:unit` under `TZ=UTC`, `lint`, `lint:css`, `build`) green at each step. `DateRangePicker`
component test remains **deprioritized** (its logic is already unit-tested via `validateDateRangeInput`
and its interaction is fully stellar-`DateRangePicker`-mediated). Ready for Phase 4 (E2E).

## Phase 4 — E2E critical journeys (Playwright)

Delivered the §4/§Phase-4 goal: route-mocked, no-live-backend Playwright journeys covering the
real-browser flows deferred from Phase 3. All run **chromium-only** as the PR gate.

### Infrastructure

- **`e2e-tests/utilities/mockApi.ts`** — `setupApiMocks(page, overrides?)` intercepts every data
  request via `page.route()` (regex matchers) and serves deterministic fixtures, so there is **no
  live-backend dependency**:
  - `GET …/ui/fetch/default-view` → `{ data: <view> }`
  - `POST …/ui/store/default-view` → `{}` **and captures the POST body** into `savedViewBodies`
  - `GET …/missions/` → `{ data: [GRACE-FO] }`
  - `GET …/missions/{id}/products` → `{ data: [<product>] }`
  - `GET …/instruments/{id}/data…` → empty `DataResponse`
    Exports a deterministic `makeView()` (one page-group → `Page A` → `Section One` → chart entity
    `My Chart`) and a `PRODUCT` with `temperature`/`pressure` float fields. Fixtures use fixed
    ids/urls/labels (not the random factory names) so selectors are stable.
- **`playwright.config.ts` webServer fixed** (§3.6/§Phase-4.3): `command` is now
  `npm run build && npm run preview` (the build must exist before `preview`), `timeout` raised
  `10s → 180s`, and `reuseExistingServer: !CI` to avoid rebuilds locally.
- **CI re-enabled** (`.github/workflows/build.yml`): the commented-out e2e step is now
  `npx playwright test --project=chromium` with `VITE_APP_TITLE`/`VITE_APP_PATH` env so the
  webServer build uses the correct base path. (firefox/webkit remain available for a nightly job.)

### Journeys (6 new tests across 5 specs, + the 2 pre-existing specs)

- **`ViewJourney.spec.ts`** — loads the mocked view; Sidebar shows the group; navigating to `Page A`
  renders the page banner + `Section One` + `My Chart` with the loading placeholder gone (products
  mocked).
- **`EntityEditor.spec.ts` (2)** — the **deferred Radix flows**: (a) switch entity type via the Radix
  `Select` (Chart→Table), edit the Title, `Done`, and see the renamed entity persisted on the page;
  (b) add a product and drive the **mission → instrument → dataset → field (cmdk `Command`) →
  version** cascade, asserting the chosen field is reflected. Editor opened via the chart header's
  hover-revealed More-options menu.
- **`SaveView.spec.ts`** — mutate the view (Add Section) → Sidebar "Save View Changes" → password
  gate (`"This will be a secret"`) → Save → **asserts the captured POST body shape** contains the
  new section under `data.pageGroups[0].pages[0].sections`.
- **`DateRange.spec.ts`** — the `DateRangePicker` typed path: an invalid entry surfaces
  `"Invalid start date"` on Enter; a valid in-bounds entry clears it.
- **`RenameSection.spec.ts`** — the **prompt value round-trip** that jsdom could not verify (Phase
  3.2): section "…" → Rename → prompt pre-filled with the current title → type a new name → Okay →
  the new title round-trips into the section header.

### Results / notes

- CI-simulated run (`CI=1 … --project=chromium`): **7 passed, 1 skipped** — the pre-existing
  `Entities.spec.ts` (real-backend) still `test.skip`s under CI by design; `Navigation.spec.ts` and
  all 6 new tests pass. Local full-suite run of the 6 new specs is green.
- Playwright chromium browser binary had to be installed (`npx playwright install chromium`); CI
  already does `npx playwright install --with-deps`.
- The deferred-flow debts from Phase 3 (Radix `Select`, cmdk `Command`, `DateRangePicker` typed
  validation, and the legacy named-form-control `prompt` value round-trip) are now **covered at the
  browser layer** as promised.

## Phase 5 — Ratchet and gate

Turned the accumulated coverage/mutation work into **enforced CI gates** plus a diffable
metrics trail, following §5 "Ratchets, not aspirational thresholds" and "Never headline a
single global number".

### 5.1 Per-scope coverage ratchets (`vite.config.ts`)

Added `coverage.thresholds` with **per-directory and per-file glob keys only — no global
threshold** (the repo-wide number is meaningless under `all: true` with by-design-untested
canvas/route code). Floors set slightly below current reality so coverage can only go up:

| Scope                                                                                                       | L   | S   | F   | B   | (current)         |
| ----------------------------------------------------------------------------------------------------------- | --- | --- | --- | --- | ----------------- |
| `src/utilities/**`                                                                                          | 99  | 99  | 99  | 87  | 100/100/100/95.73 |
| extracted logic (`chart-data`, `table-utils`, `data-grid-utils`, `date-range-utils`, `entity-editor-utils`) | 100 | 100 | 100 | 100 | all 100           |
| `src/components/app/SaveViewModal.tsx`                                                                      | 98  | 98  | 70  | 98  | 100/100/71/100    |
| `src/components/ui/AlertDialogProvider.tsx`                                                                 | 96  | 96  | 85  | 85  | 98/98/89/89       |
| `src/components/ui/ProductsSelector.tsx`                                                                    | 90  | 90  | 80  | 92  | 93/93/83/94       |
| `src/components/ui/ProductSelector.tsx`                                                                     | 58  | 58  | 35  | 43  | 61/61/38/45       |
| `src/components/app/Sidebar/**`                                                                             | 98  | 98  | 74  | 93  | 100/100/77/96     |
| `src/hooks/**`                                                                                              | 87  | 87  | 95  | 72  | 89/89/100/75      |

- **Semantics verified empirically**: vitest glob thresholds are checked against the
  _aggregate_ of files matching the glob. Confirmed by temporarily raising the utilities
  branch floor to 99 → `ERROR: Coverage for branches (95.73%) does not meet
"src/utilities/**" threshold (99%)`, then reverting. `VITEST_EXIT=1` on breach, `0` when met.
- `map/**` is intentionally **excluded from coverage** (§5 canvas policy) so it is not
  thresholded here — it is covered by mutation only.
- `EntityEditor.tsx` (heavy component, exercised via Phase 4 e2e) is deliberately **not**
  coverage-gated to avoid render-coverage chasing.

### 5.2 Mutation `break` gate (`stryker.config.json`)

Added `"thresholds": { "high": 97, "low": 90, "break": 95 }`. Current score **97.93%**
(1131 Killed / 7 Timeout / 24 Survived / 0 NoCoverage → detected 1138/1162), so the run
passes with headroom: Stryker logs _"Final mutation score of 97.93 is greater than or equal
to break threshold 95"_ and exits 0. The mutated scope is unchanged (§5 — pure logic only,
no `.tsx`). Raise `break` toward 97 as survivors are eliminated.

### 5.3 Diffable metrics summary (CI)

- **`scripts/metrics-summary.mjs`** parses `test-metrics/coverage/coverage-summary.json` and
  `test-metrics/mutation/mutation.json` and emits a Markdown table (gated-scope coverage +
  mutation score/status counts) to `$GITHUB_STEP_SUMMARY` and stdout. Reporting only — it
  never fails the build (the thresholds do). The repo-wide line number is shown labelled
  _informational only; not gated_.
- **`.github/workflows/build.yml`**: new `Publish metrics summary` step (`if: !cancelled()`,
  so numbers appear even when a gate fails). The existing `Run unit tests with coverage`
  (now threshold-gated) and `Run mutation tests` (now `break`-gated) steps become the actual
  gates; e2e was re-enabled in Phase 4.

### Results / notes

- All §8 gates green after the change: `test:unit --coverage` (thresholds pass, 249 tests),
  `test:mutation` (break pass), `build`, `lint`, `lint:css`.
- Repo-wide line coverage rose **15.25% → 28.07%** over Phases 1–3 (informational).
- Metrics artifacts (`coverage-summary.json`, `mutation.json`) regenerated as the machine-
  readable baseline for future before/after diffs.

## Open questions for maintainers

> **STATUS — PENDING MAINTAINER RULINGS (carried into Phase 3+).** As of the start of Phase 3
> (component tests), **Q1, Q3, Q4, Q5 remain unresolved** and are blocking the associated
> correctness fixes. Per project policy, none of these behaviors have been changed — each is only
> characterized by a test that pins the _current_ (suspected-buggy) behavior, so the suite stays
> green and the defect is documented rather than silently "fixed". Once a ruling is given I will
> land the minimal fix + a regression test (and, where noted, extract a small pure helper).
> Q2 (artifacts/gitignore) is **resolved** (Phase 0.7). Phase 3 proceeds independently of these
> rulings because it tests component interaction/wiring, not the disputed logic.

| #   | Location                          | Suspected defect                                      | Blocks                              | Ruling                     |
| --- | --------------------------------- | ----------------------------------------------------- | ----------------------------------- | -------------------------- |
| Q1  | `api.ts`                          | 200–400 success window accepts 3xx                    | characterization test only          | **pending**                |
| Q3  | `product.ts applyFieldThresholds` | `effective_since` ignored when both dates set         | 1-line fix + test                   | **pending**                |
| Q4  | `ViewPage.onAddEntity`            | section layout duplicated on add                      | fix + `addEntityToSection` + test   | **pending**                |
| Q5  | `DownlinkDashboard`               | dataset with rows marked `"error"` (inverted)         | fix + `computeDatasetStatus` + test | **pending**                |
| Q6  | `SaveViewModal.tsx`               | hard-coded plaintext admin password, client-only gate | security review                     | **pending (non-blocking)** |

- **Q1 (D1)**: Is the 200–400 success window in `api.ts` intentional (accepting 3xx)? Test
  will document current behavior; product behavior unchanged pending your call.
- **Q4 (D4)**: In `ViewPage.tsx` `onAddEntity`, the new section layout is built as
  `newLayout = [...s.layout, newItem]` and then assigned `layout: s.layout.concat(newLayout)`, which
  yields `s.layout` **duplicated** plus the new item (existing `layout.i` keys appear twice). Almost
  certainly a bug — intended is likely `layout: newLayout`. **Not extracted or changed** (would enshrine
  the bug in a test); flagged for your call. If confirmed, I'll add `addEntityToSection` + a fixing test.
- **Q5 (D5)**: In `DownlinkDashboard.tsx`, the per-dataset status is
  `loading ? "loading" : (data?…result.data.length || error) ? "error" : "nominal"`. The
  `data.length` term means a dataset that **successfully returned rows** is marked `"error"`, and
  an empty-but-successful fetch is `"nominal"` — this looks inverted. Likely intended is just
  `error ? "error" : "nominal"` (or gate on `!data.length && error`). Flagged only; not changed.
  If confirmed, I'll extract `computeDatasetStatus(loading, hasData, error)` + a fixing test.
- **Q3 (D3)**: In `applyFieldThresholds`, when a threshold has both `effective_since` and
  `effective_until`, `effective_since` is currently ignored (overwritten). Intended logic is
  almost certainly `inRange = (since ? since <= ts : true) && (until ? until >= ts : true)`.
  Flagged only; not changed. Confirm before I fix (Phase 2 candidate).
- **Q6 (security, surfaced in Phase 3.1)**: `SaveViewModal.tsx` gates the "make this the default
  view for all users" action behind a **hard-coded plaintext string** compared entirely
  client-side (`const secret = "This will be a secret"; allowSave = secret.toLowerCase() === password.toLowerCase()`).
  This is not a real access control — anyone can read it from the bundle or bypass it. The actual
  authorization must live server-side in `saveView`. **Non-blocking for Phase 3** (the component
  test pins current behavior); flagged for a security review. Not changed.
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
