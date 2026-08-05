#!/usr/bin/env node
/**
 * Phase 5 (§Phase-5.3 / §7): emit a diffable metrics summary from the coverage and
 * mutation JSON artifacts so before/after is visible on every PR.
 *
 * Reads:
 *   test-metrics/coverage/coverage-summary.json   (vitest json-summary reporter)
 *   test-metrics/mutation/mutation.json           (stryker json reporter)
 *
 * Writes a Markdown table to $GITHUB_STEP_SUMMARY when present, and always to stdout.
 * Never fails the build — gating is done by the vitest/stryker thresholds themselves,
 * not by this reporter.
 */
import { appendFileSync, readFileSync } from "node:fs";

const COVERAGE_PATH = "test-metrics/coverage/coverage-summary.json";
const MUTATION_PATH = "test-metrics/mutation/mutation.json";

/** Scopes we gate in vite.config.ts — kept in sync so the summary mirrors the ratchets. */
const GATED_SCOPES = [
  "src/utilities/",
  "src/hooks/",
  "src/components/app/Sidebar/",
  "src/components/entities/chart/chart-data.ts",
  "src/components/entities/table/table-utils.ts",
  "src/components/ui/DataGrid/data-grid-utils.ts",
  "src/components/ui/date-range-utils.ts",
  "src/components/ui/entity-editor-utils.ts",
  "src/components/app/SaveViewModal.tsx",
  "src/components/ui/AlertDialogProvider.tsx",
  "src/components/ui/ProductsSelector.tsx",
  "src/components/ui/ProductSelector.tsx",
];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function relKey(path) {
  const p = path.replace(/\\/g, "/");
  const i = p.indexOf("src/");
  return i >= 0 ? p.slice(i) : p;
}

function pct(covered, total) {
  return total ? (100 * covered) / total : 100;
}

function coverageRows(summary) {
  if (!summary) return null;
  const metrics = ["lines", "statements", "functions", "branches"];
  const rows = [];
  for (const scope of GATED_SCOPES) {
    const acc = Object.fromEntries(metrics.map((m) => [m, [0, 0]]));
    for (const [path, entry] of Object.entries(summary)) {
      if (path === "total") continue;
      const rel = relKey(path);
      const isDir = scope.endsWith("/");
      if (isDir ? rel.startsWith(scope) : rel === scope || rel.endsWith(scope)) {
        for (const m of metrics) {
          acc[m][0] += entry[m].covered;
          acc[m][1] += entry[m].total;
        }
      }
    }
    if (acc.lines[1] === 0) continue; // scope not present (e.g. excluded from coverage)
    rows.push({
      scope,
      lines: pct(...acc.lines),
      statements: pct(...acc.statements),
      functions: pct(...acc.functions),
      branches: pct(...acc.branches),
    });
  }
  return rows;
}

function mutationStats(report) {
  if (!report?.files) return null;
  const counts = {};
  for (const info of Object.values(report.files)) {
    for (const m of info.mutants || []) {
      counts[m.status] = (counts[m.status] || 0) + 1;
    }
  }
  const killed = counts.Killed || 0;
  const timeout = counts.Timeout || 0;
  const survived = counts.Survived || 0;
  const noCoverage = counts.NoCoverage || 0;
  const detected = killed + timeout;
  const valid = detected + survived + noCoverage;
  return { counts, detected, valid, score: valid ? (100 * detected) / valid : 0 };
}

function fmt(n) {
  return `${n.toFixed(2)}%`;
}

function build() {
  const lines = ["## Test metrics", ""];

  const coverage = readJson(COVERAGE_PATH);
  const rows = coverageRows(coverage);
  lines.push("### Coverage (gated scopes)");
  if (!rows) {
    lines.push("_No coverage summary found._");
  } else {
    lines.push("| Scope | Lines | Statements | Functions | Branches |");
    lines.push("| --- | ---: | ---: | ---: | ---: |");
    for (const r of rows) {
      lines.push(
        `| \`${r.scope}\` | ${fmt(r.lines)} | ${fmt(r.statements)} | ${fmt(
          r.functions,
        )} | ${fmt(r.branches)} |`,
      );
    }
    if (coverage.total) {
      lines.push(
        `\n_Repo-wide lines ${fmt(
          coverage.total.lines.pct,
        )} — informational only; not gated (see §5)._`,
      );
    }
  }

  lines.push("", "### Mutation (Stryker scope)");
  const mut = mutationStats(readJson(MUTATION_PATH));
  if (!mut) {
    lines.push("_No mutation report found._");
  } else {
    const c = mut.counts;
    lines.push(`- **Mutation score: ${fmt(mut.score)}** (break threshold: 95%)`);
    lines.push(
      `- Killed ${c.Killed || 0}, Timeout ${c.Timeout || 0}, Survived ${
        c.Survived || 0
      }, NoCoverage ${c.NoCoverage || 0} (detected ${mut.detected}/${mut.valid})`,
    );
  }

  return lines.join("\n") + "\n";
}

const out = build();
process.stdout.write(out);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
}
