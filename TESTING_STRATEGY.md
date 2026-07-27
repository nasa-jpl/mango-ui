# MANGO UI — Testing Strategy Implementation Handoff

**Audience**: An AI coding agent (or engineer) implementing this strategy with no prior
conversation context. Read this file *and* `CLAUDE.md` (repo root) before writing any code.
`CLAUDE.md` covers the application architecture; this file covers the testing plan, the
recorded baseline, and the constraints on how the work must be done.

**Branch**: `add-testing` (branched from `main`). Strategy designed 2026-07-27.

---

## 1. Objective

Take this codebase from a near-zero automated-testing posture to a layered, CI-enforced
test suite — and do it in a way where impact is **measurable against a recorded baseline**
(coverage and mutation score before/after). The measurement discipline is a first-class
deliverable, not an afterthought: results will be presented to management.

## 2. Recorded baseline — DO NOT lose or overwrite this

Captured 2026-07-27 on `add-testing` at commit `022829f`:

| Metric | Value | Command |
|---|---|---|
| Unit tests | 10 tests / 3 files, all passing | `npm run test:unit` |
| Statement coverage, whole app | **3.26%** | `npx vitest run --coverage` (v8, all-files) |
| Statement coverage, `src/utilities/` | 33.45% | same |
| Function coverage, whole app | 17.44% | same |
| Branch coverage, whole app | 47.61% — **artifact of tiny denominator; never quote this as a headline number** | same |
| Mutation score, `src/utilities/` (total) | **21.70%** | `npm run test:mutation` (~7s runtime) |
| Mutation score, covered code only | 83.92% | same |
| Mutants killed / survived / no-coverage | 117 / 23 / 410 | same |
| E2E tests | 2 specs, 69 lines, **disabled in CI** (commented out in `.github/workflows/build.yml`) | `npm run test:e2e` |

Interpretation (carry this into any reporting):
- Existing tests are *good* (83.92% covered-mutation score) but *narrow* (410 of 553
  mutants unreached). The problem is reach, not test quality.
- The 23 surviving mutants are a concrete worklist. 21 are in `view.ts`. Known example:
  `view.ts:215` — mutating the d3 format specifier `"~g"` → `""` in `formatYValue`
  survives (tests call the function, never assert on formatted output). Full list:
  `test-metrics/mutation/mutation-report.html`.

## 3. Current-state facts (verified, with locations)

Codebase: ~11,400 LOC TypeScript/React. Logic risk is concentrated:

| File | LOC | Why it matters |
|---|---|---|
| `src/components/entities/chart/Chart.tsx` | 1,729 | `fetchLayerData` (line ~945), `configureChartAxes` (line ~368), transform application, zoom/pan math — pure logic trapped in a component |
| `src/components/ui/EntityEditor.tsx` | 1,051 | Form state/validation for entity config |
| `src/components/mission/GRACE/DownlinkDashboard.tsx` | 949 | Mission-specific derived state |
| `src/components/entities/table/Table.tsx` | 848 | ag-grid config + custom filtering |
| `src/utilities/view.ts` | 318 | View tree factories, serialization, duplication — the domain model; persistence-critical |
| `src/utilities/api.ts` | 172 | API client — currently **0% coverage** |
| `src/utilities/time.ts` | 39 | Time utils — currently **0% coverage** |

Infrastructure gaps (each is a Phase 0 task):

1. **`vite.config.ts` line ~67**: vitest `include` is `["./src/**/*.test.ts"]` — no `.tsx`,
   no DOM environment configured. Component testing is structurally impossible today.
2. **No testing-library**: `@testing-library/react`, `@testing-library/jest-dom`,
   `@testing-library/user-event`, and `jsdom` are not installed.
3. **Inverted test dependency**: `src/utilities/dataset.test.ts` imports factories from
   `../../e2e-tests/utilities/{product,view}`. Unit tests must not depend on the e2e tree.
4. **No vitest coverage config**: `@vitest/coverage-v8` is installed but there is no
   `coverage` block — no reporters, no thresholds, output location unspecified.
5. **`stryker.config.json`**: scope is `src/utilities/**` (correct — see §5 policy);
   `incremental` is `false`; reporters lack `"json"`, so scores aren't diffable artifacts.
6. **Playwright runs against `npm run preview`** (`playwright.config.ts` webServer): a
   production build with **no `/api` proxy** (only the dev `server` block in
   `vite.config.ts` has one). E2E therefore cannot exercise data flows against a backend —
   which is fine, because the strategy mandates mocked APIs (see Phase 4) — but the
   webServer `timeout: 10s` assumes a pre-existing build.
7. **CI (`.github/workflows/build.yml`)**: runs `npm run test:unit` with no coverage
   output, no thresholds; e2e step commented out; no mutation step.
8. **No timezone pinning**: tests run in the developer's local TZ. This is a satellite
   telemetry app; time bugs are the classic failure mode.

## 4. Target end state

- `src/utilities/` + all extracted logic modules: mutation score **≥ 85% (total)**.
- Component tests for form/interaction components (see Phase 3 list).
- 4–6 Playwright critical-journey specs with mocked `/api`, running (chromium) on every PR.
- CI: coverage + mutation artifacts on every PR; per-directory coverage ratchets;
  e2e re-enabled and gating.
- `IMPACT.md` contemporaneous log (see §7).

## 5. Standing policies (do not violate)

- **Mutation scope stays logic-only, forever.** Never add `.tsx`/component files to
  Stryker's `mutate` array. JSX mutants are noise; component-test runs make mutation
  runtimes explode. As logic is extracted out of components into plain modules, add those
  modules to `mutate`. The headline metric is "mutation score on logic modules," always
  reported with its scope.
- **No render-coverage chasing on canvas/WebGL components.** `Map.tsx` (Cesium), the
  Chart.js canvas, ag-grid internals: mock at the boundary, exclude from coverage targets,
  cover their logic via extraction, cover their rendering via e2e smoke. Coverage config
  must exclude these paths from thresholds so nobody is incentivized to write garbage tests.
- **Chart assertions target the Chart.js config object, not pixels.** Chart.js is
  config-driven; snapshot/assert the generated scales/datasets/options structures. No
  canvas screenshot assertions in unit/component tests.
- **Characterize before refactoring.** No extraction from `Chart.tsx`/`EntityEditor.tsx`
  lands without a safety net in place first (e2e journey or config-object characterization
  tests capturing current behavior).
- **Ratchets, not aspirational thresholds.** Per-directory coverage thresholds set slightly
  below current reality, raised as work lands. Never a global threshold the team will game
  or ignore.
- **Pin `TZ=UTC` in test scripts**, and write explicit non-UTC test cases for time logic.
- **Never headline branch coverage or a single global coverage number.** Per-scope numbers
  with rationale. Mutation score always cited with its scope.
- **Preserve baselines.** Metrics artifacts are additive; never delete or regenerate the
  §2 baseline record.

## 6. Phased plan

Work the phases in order. Each phase ends with: all suites green, metrics artifacts
regenerated, `IMPACT.md` updated, work committed (small commits, one concern each).

### Phase 0 — Infrastructure (no product code changes)
1. Vitest: include `./src/**/*.test.{ts,tsx}`; keep pure-logic tests in the fast node
   environment and enable DOM per-file (`// @vitest-environment jsdom`) or via a
   workspace/project split — do not force jsdom on everything.
2. Install `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`,
   `@testing-library/user-event`; add a test setup file.
3. Coverage config: `provider: "v8"`, explicit `all: true`, include `src/**`,
   reporters `["text", "lcov", "json-summary"]`, output under `test-metrics/coverage/`.
   Add exclusions per §5 (Cesium/canvas render paths, `src/types/`, `main.tsx`).
4. Stryker: add `"json"` reporter (output under `test-metrics/mutation/`); set
   `incremental: true`.
5. Move shared factories from `e2e-tests/utilities/` to `src/test-utils/factories/`;
   update both unit and e2e imports (e2e importing from src is fine; the reverse is not).
6. `TZ=UTC` on `test` / `test:unit` scripts.
7. Re-run coverage + mutation; commit the JSON artifacts as the machine-readable baseline
   (numbers must match §2 within noise).
8. CI: upload coverage + mutation artifacts on PRs (gating comes later, Phase 5).

### Phase 1 — Saturate the pure core (`src/utilities/`)
1. Kill the 23 surviving mutants (worklist in the mutation report) — each survivor is a
   missing assertion.
2. `api.ts` 0% → full: mock `fetch` (vi.stubGlobal or MSW). Must cover: URL/template
   construction, header/credentials policy, error paths + toast/throw behavior, and
   `getData()`'s lazy `json()`/`cancel()` contract including AbortController races
   (fake timers).
   - **Flag, don't silently change**: `api.ts` treats HTTP 200–400 as success, which
     includes 3xx. Write the test documenting current behavior and record the question in
     `IMPACT.md` for the maintainers.
3. `time.ts` 0% → full, with explicit timezone edge cases.
4. `view.ts` / `product.ts` / `generic.ts`: fill no-coverage regions. Priority in
   `view.ts`: serialization round-trip, `duplicateEntity`/`duplicateSection` (new UUIDs,
   layout integrity), `applyLayerTransforms` (self + derived transforms, the null-on-no-
   matching-point contract).
5. Exit criteria: utilities mutation score ≥ 85% total.

### Phase 2 — Extract logic from components, then test it
Targets, in order: `Chart.tsx` (axis/tick configuration, transform pipeline & downsampling
decisions, fetch-orchestration decision logic), `EntityEditor.tsx` (validation rules),
`Table.tsx` (filter logic). Method, per extraction:
1. Write characterization tests against current behavior first (Chart.js config-object
   snapshots; for EntityEditor, testing-library form-behavior tests).
2. Extract to a plain module (suggested: `src/components/entities/chart/chart-config.ts`
   etc. or `src/utilities/`), pure functions, no React imports.
3. Unit-test the module; add it to Stryker `mutate`; drive its mutation score ≥ 85%.
4. Keep each extraction PR-sized. `Chart.tsx` will take several passes; that's expected.

### Phase 3 — Component tests (selective)
`EntityEditor`, `ProductSelector`, `ProductsSelector`, `DateRangePicker`,
`AlertDialogProvider`, `SaveViewModal`, `Sidebar`. Testing-library, user-event, behavioral
assertions (what the user sees/does), not implementation details. Skip: `Map.tsx`, chart
canvas rendering, ag-grid internals (§5).

### Phase 4 — E2E critical journeys
1. Route-mock all `/api/*` via Playwright `page.route()` with fixtures built from the
   shared factories (`src/test-utils/factories/`). No live-backend dependency.
2. Journeys: load default view → render; add entity with data layer → plot mocked data;
   save view (assert POST body shape); share view via URL params; navigate pages/sections;
   one error-path journey (API 500 → user-visible error handling).
3. Config: chromium-only for the PR gate; firefox/webkit in a nightly job. Fix the
   webServer arrangement (build must exist before preview; raise the 10s timeout or build
   in the webServer command).
4. Re-enable the e2e step in `.github/workflows/build.yml`.

### Phase 5 — Ratchet and gate
1. Per-directory coverage thresholds at slightly-below-current; raise them as phases land.
2. Stryker `thresholds` (`break`) for the mutated scope in CI.
3. CI publishes a metrics summary (parse `test-metrics/coverage/coverage-summary.json` +
   mutation `metrics.json`) so before/after is a diffable artifact trail.

## 7. Impact logging (required, contemporaneous)

Maintain `IMPACT.md` at repo root from the first commit. Log as they happen:
- Every real or suspected defect found while writing tests (file:line, description,
  status). Seed entries: the `api.ts` 200–400/3xx success policy; the `view.ts:215`
  formatYValue missing assertion.
- Every surviving mutant killed (running count against the 23 baseline).
- Per-phase metric snapshots (mutation score with scope, per-directory coverage, test
  count, suite runtime).
- Open questions for maintainers.
Retroactive impact reports read as thin; contemporaneous ones don't. Final deliverable
includes a before/after report generated from the committed JSON artifacts against §2.

## 8. Verification commands

```bash
npm run test:unit                 # vitest single run (must stay green)
npx vitest run --coverage         # coverage → test-metrics/coverage/
npm run test:mutation             # stryker → test-metrics/mutation/ (~7s at baseline)
npm run test:e2e                  # playwright (needs build + certs; see CLAUDE.md setup)
npm run lint && npm run lint:css  # must stay clean
npm run build                     # tsc strict check + vite build (must stay green)
```

Constraints: never weaken `tsc` settings or use `build:force` to get green; don't upgrade
dependencies unless a phase requires it (record any bump in `IMPACT.md`); match existing
code style (see `CLAUDE.md`); do not modify the deploy job in `build.yml`.
