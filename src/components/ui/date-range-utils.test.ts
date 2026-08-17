import { expect, test } from "vitest";
import {
  DateRangeValidationInput,
  validateDateRangeInput,
} from "./date-range-utils";

const MIN = new Date("2020-01-01T00:00:00Z");
const MAX = new Date("2030-01-01T00:00:00Z");

function input(
  overrides: Partial<DateRangeValidationInput> = {},
): DateRangeValidationInput {
  return {
    dateFormat: "long",
    dateString: "2025-06-15T00:00:00Z",
    maxDate: MAX,
    minDate: MIN,
    otherDateString: "2025-06-20T00:00:00Z",
    which: "from",
    ...overrides,
  };
}

test("validateDateRangeInput reports a required start date when editing an empty 'from'", () => {
  const result = validateDateRangeInput(
    input({ dateString: "", which: "from" }),
  );
  expect(result).toEqual({ valid: false, error: "Start date required" });
});

test("validateDateRangeInput reports a required end date when editing an empty 'to'", () => {
  const result = validateDateRangeInput(input({ dateString: "", which: "to" }));
  expect(result).toEqual({ valid: false, error: "End date required" });
});

test("validateDateRangeInput reports an invalid edited date", () => {
  const result = validateDateRangeInput(
    input({ dateString: "not-a-date", which: "from" }),
  );
  expect(result).toEqual({ valid: false, error: "Invalid start date" });
});

test("validateDateRangeInput reports an invalid edited end date when editing 'to'", () => {
  const result = validateDateRangeInput(
    input({ dateString: "not-a-date", which: "to" }),
  );
  expect(result).toEqual({ valid: false, error: "Invalid end date" });
});

test("validateDateRangeInput reports out-of-range when before the min date", () => {
  const result = validateDateRangeInput(
    input({ dateString: "2019-06-15T00:00:00Z" }),
  );
  expect(result).toEqual({ valid: false, error: "Date out of range" });
});

test("validateDateRangeInput reports out-of-range when after the max date", () => {
  const result = validateDateRangeInput(
    input({ dateString: "2031-06-15T00:00:00Z" }),
  );
  expect(result).toEqual({ valid: false, error: "Date out of range" });
});

test("validateDateRangeInput reports the counterpart end date as invalid (editing 'from')", () => {
  const result = validateDateRangeInput(
    input({ which: "from", otherDateString: "garbage" }),
  );
  expect(result).toEqual({ valid: false, error: "Invalid end date" });
});

test("validateDateRangeInput reports the counterpart start date as invalid (editing 'to')", () => {
  const result = validateDateRangeInput(
    input({ which: "to", otherDateString: "garbage" }),
  );
  expect(result).toEqual({ valid: false, error: "Invalid start date" });
});

test("validateDateRangeInput rejects a start that comes after the end", () => {
  const result = validateDateRangeInput(
    input({
      which: "from",
      dateString: "2025-06-25T00:00:00Z",
      otherDateString: "2025-06-20T00:00:00Z",
    }),
  );
  expect(result).toEqual({
    valid: false,
    error: "Start date must precede end date",
  });
});

test("validateDateRangeInput resolves start/end when editing the 'from' field", () => {
  const result = validateDateRangeInput(
    input({
      which: "from",
      dateString: "2025-06-15T00:00:00Z",
      otherDateString: "2025-06-20T00:00:00Z",
    }),
  );
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.startDate.getTime()).toBe(
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.endDate.getTime()).toBe(
      new Date("2025-06-20T00:00:00Z").getTime(),
    );
  }
});

test("validateDateRangeInput resolves start/end when editing the 'to' field", () => {
  const result = validateDateRangeInput(
    input({
      which: "to",
      dateString: "2025-06-20T00:00:00Z",
      otherDateString: "2025-06-15T00:00:00Z",
    }),
  );
  expect(result.valid).toBe(true);
  if (result.valid) {
    // The edited "to" becomes the end; the counterpart becomes the start.
    expect(result.startDate.getTime()).toBe(
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.endDate.getTime()).toBe(
      new Date("2025-06-20T00:00:00Z").getTime(),
    );
  }
});

test("validateDateRangeInput appends midnight for the short (date-only) format", () => {
  const result = validateDateRangeInput(
    input({
      dateFormat: "short",
      which: "from",
      dateString: "2025-06-15",
      otherDateString: "2025-06-20",
    }),
  );
  expect(result.valid).toBe(true);
  if (result.valid) {
    expect(result.startDate.getTime()).toBe(
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.endDate.getTime()).toBe(
      new Date("2025-06-20T00:00:00Z").getTime(),
    );
  }
});
