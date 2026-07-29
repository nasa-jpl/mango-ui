import { expect, test } from "vitest";
import {
  formatTableCellValue,
  formatTimestampValue,
  getAGGridFilterType,
  getFieldDisplayValue,
  TableFieldValue,
} from "./table-utils";

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
