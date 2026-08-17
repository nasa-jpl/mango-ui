import { expect, test } from "vitest";
import type {
  ComputedThresholds,
  ProcessedDataResponseDataEntry,
} from "../../../types/app";
import type { TableColumn } from "../../../types/view";
import {
  buildThresholdTooltip,
  deriveRowTrippedStatus,
  formatTableCellValue,
  formatTimestampValue,
  getAGGridFilterType,
  getFieldDisplayValue,
  getRowThresholdClass,
  TableFieldValue,
} from "./table-utils";

function thresholdValues(
  lowerValue: number | null,
  upperValue: number | null,
): ComputedThresholds["limits"] {
  return {
    lower: false,
    lower_value: lowerValue,
    upper: false,
    upper_value: upperValue,
  };
}

type TrippedFlags = Partial<{
  limitLower: boolean;
  limitUpper: boolean;
  warnLower: boolean;
  warnUpper: boolean;
}>;

function thresholds(flags: TrippedFlags = {}): ComputedThresholds {
  return {
    limits: {
      lower: !!flags.limitLower,
      lower_value: null,
      upper: !!flags.limitUpper,
      upper_value: null,
    },
    warnings: {
      lower: !!flags.warnLower,
      lower_value: null,
      upper: !!flags.warnUpper,
      upper_value: null,
    },
  };
}

function col(layerId: string, field: string): TableColumn {
  return { id: `${layerId}.${field}`, field, layerId };
}

function rowWithCell(
  layerId: string,
  field: string,
  cell: unknown,
): Record<string, ProcessedDataResponseDataEntry> {
  return {
    [layerId]: {
      timestamp: "t",
      [field]: cell,
    },
  } as unknown as Record<string, ProcessedDataResponseDataEntry>;
}

// --- getAGGridFilterType ----------------------------------------------------

test("getAGGridFilterType maps each known field type to its ag-grid filter", () => {
  expect(getAGGridFilterType("int")).toBe("agNumberColumnFilter");
  expect(getAGGridFilterType("float")).toBe("agNumberColumnFilter");
  expect(getAGGridFilterType("str")).toBe("agTextColumnFilter");
  expect(getAGGridFilterType("bool")).toBe("agTextColumnFilter");
  expect(getAGGridFilterType("datetime")).toBe("agDateColumnFilter");
  expect(getAGGridFilterType("dict")).toBe("agTextColumnFilter");
});

test("getAGGridFilterType returns true for unknown types", () => {
  expect(getAGGridFilterType("something-else")).toBe(true);
});

// --- getFieldDisplayValue ---------------------------------------------------

test("getFieldDisplayValue returns a raw non-object value as-is", () => {
  expect(getFieldDisplayValue(5 as unknown as TableFieldValue)).toBe(5);
  expect(getFieldDisplayValue("raw" as unknown as TableFieldValue)).toBe("raw");
});

test("getFieldDisplayValue prefers value, then avg, then a min–max range", () => {
  expect(getFieldDisplayValue({ value: 3 })).toBe(3);
  // value wins over avg
  expect(getFieldDisplayValue({ value: 3, avg: 9 })).toBe(3);
  // avg wins over min/max
  expect(getFieldDisplayValue({ avg: 4, min: 1, max: 9 })).toBe(4);
  expect(getFieldDisplayValue({ min: 1, max: 9 })).toBe("1 – 9");
});

test("getFieldDisplayValue returns undefined when there is no usable field", () => {
  expect(getFieldDisplayValue({})).toBeUndefined();
  // min without max (and vice versa) is not a usable range
  expect(getFieldDisplayValue({ min: 1 })).toBeUndefined();
  expect(getFieldDisplayValue({ max: 9 })).toBeUndefined();
});

// --- formatTableCellValue ---------------------------------------------------

test("formatTableCellValue truncates a short datetime to the day", () => {
  expect(
    formatTableCellValue("2020-01-02T03:04:05+00:00", "datetime", "short"),
  ).toBe("2020-01-02");
});

test("formatTableCellValue truncates a full datetime at the offset boundary", () => {
  expect(
    formatTableCellValue("2020-01-02T03:04:05+00:00", "datetime", undefined),
  ).toBe("2020-01-02T03:04:05");
});

test("formatTableCellValue only applies datetime formatting for datetime types", () => {
  // A non-datetime type with dateFormat 'short' must NOT be split on 'T'.
  expect(formatTableCellValue("aTb", "str", "short")).toBe("aTb");
});

test("formatTableCellValue renders an empty value as a dash", () => {
  expect(formatTableCellValue("", "float", undefined)).toBe("-");
});

test("formatTableCellValue passes non-empty, non-datetime values through", () => {
  expect(formatTableCellValue("hello", "str", undefined)).toBe("hello");
});

// --- formatTimestampValue ---------------------------------------------------

test("formatTimestampValue truncates to the day when collapsing by day", () => {
  expect(formatTimestampValue("2020-01-02T03:04:05+00:00", true)).toBe(
    "2020-01-02",
  );
});

test("formatTimestampValue truncates at the offset boundary otherwise", () => {
  expect(formatTimestampValue("2020-01-02T03:04:05+00:00", false)).toBe(
    "2020-01-02T03:04:05",
  );
});

// --- deriveRowTrippedStatus -------------------------------------------------

test("deriveRowTrippedStatus is nominal with no columns or no row data", () => {
  expect(deriveRowTrippedStatus(rowWithCell("L", "f", { value: 1 }), [])).toBe(
    "nominal",
  );
  expect(deriveRowTrippedStatus(null, [col("L", "f")])).toBe("nominal");
  expect(deriveRowTrippedStatus(undefined, [col("L", "f")])).toBe("nominal");
});

test("deriveRowTrippedStatus skips columns whose layer/field is absent from the row", () => {
  const row = rowWithCell("L", "f", {
    value: 1,
    _thresholds: thresholds({ limitLower: true }),
  });
  // layer id not present
  expect(deriveRowTrippedStatus(row, [col("X", "f")])).toBe("nominal");
  // field not present in the layer entry
  expect(deriveRowTrippedStatus(row, [col("L", "g")])).toBe("nominal");
});

test("deriveRowTrippedStatus skips cells that are missing or lack computed thresholds", () => {
  expect(
    deriveRowTrippedStatus(rowWithCell("L", "f", undefined), [col("L", "f")]),
  ).toBe("nominal");
  expect(
    deriveRowTrippedStatus(rowWithCell("L", "f", { value: 1 }), [
      col("L", "f"),
    ]),
  ).toBe("nominal");
});

test("deriveRowTrippedStatus is nominal when a cell has thresholds but none are tripped", () => {
  const row = rowWithCell("L", "f", { value: 1, _thresholds: thresholds() });
  expect(deriveRowTrippedStatus(row, [col("L", "f")])).toBe("nominal");
});

test("deriveRowTrippedStatus returns error when a limit (lower or upper) is tripped", () => {
  const lower = rowWithCell("L", "f", {
    value: 1,
    _thresholds: thresholds({ limitLower: true }),
  });
  const upper = rowWithCell("L", "f", {
    value: 1,
    _thresholds: thresholds({ limitUpper: true }),
  });
  expect(deriveRowTrippedStatus(lower, [col("L", "f")])).toBe("error");
  expect(deriveRowTrippedStatus(upper, [col("L", "f")])).toBe("error");
});

test("deriveRowTrippedStatus returns warning when only a warning (lower or upper) is tripped", () => {
  const lower = rowWithCell("L", "f", {
    value: 1,
    _thresholds: thresholds({ warnLower: true }),
  });
  const upper = rowWithCell("L", "f", {
    value: 1,
    _thresholds: thresholds({ warnUpper: true }),
  });
  expect(deriveRowTrippedStatus(lower, [col("L", "f")])).toBe("warning");
  expect(deriveRowTrippedStatus(upper, [col("L", "f")])).toBe("warning");
});

test("deriveRowTrippedStatus prioritizes a tripped limit over a tripped warning", () => {
  const row = rowWithCell("L", "f", {
    value: 1,
    _thresholds: thresholds({ limitLower: true, warnUpper: true }),
  });
  expect(deriveRowTrippedStatus(row, [col("L", "f")])).toBe("error");
});

test("deriveRowTrippedStatus continues past skipped columns to find a later tripped one", () => {
  const row = {
    L: {
      timestamp: "t",
      a: { value: 1 },
      b: { value: 1, _thresholds: thresholds({ limitUpper: true }) },
    },
  } as unknown as Record<string, ProcessedDataResponseDataEntry>;
  expect(deriveRowTrippedStatus(row, [col("L", "a"), col("L", "b")])).toBe(
    "error",
  );
});

// --- getRowThresholdClass ---------------------------------------------------

test("getRowThresholdClass maps a threshold status to its row CSS class", () => {
  expect(getRowThresholdClass("error")).toBe("limit-row");
  expect(getRowThresholdClass("warning")).toBe("warning-row");
  expect(getRowThresholdClass("nominal")).toBe("");
  // any non-error/warning status yields no class
  expect(getRowThresholdClass("loading")).toBe("");
});

// --- buildThresholdTooltip --------------------------------------------------

test("buildThresholdTooltip renders each limit/warning value on its own line", () => {
  expect(
    buildThresholdTooltip(
      "Temp",
      thresholdValues(10, 90),
      thresholdValues(20, 80),
    ),
  ).toBe(
    "Field: Temp \n" +
      "Lower limit value: 10 \n" +
      "Upper limit value: 90 \n" +
      "Lower warning value: 20 \n" +
      "Upper warning value: 80",
  );
});

test("buildThresholdTooltip renders a dash for each missing (null) threshold value", () => {
  expect(
    buildThresholdTooltip(
      "Temp",
      thresholdValues(null, null),
      thresholdValues(null, null),
    ),
  ).toBe(
    "Field: Temp \n" +
      "Lower limit value: - \n" +
      "Upper limit value: - \n" +
      "Lower warning value: - \n" +
      "Upper warning value: -",
  );
});
