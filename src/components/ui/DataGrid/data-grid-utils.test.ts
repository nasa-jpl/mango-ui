import { expect, test } from "vitest";
import { getFilterDisplayText } from "./data-grid-utils";

test("getFilterDisplayText returns empty string for a nullish filter model", () => {
  expect(getFilterDisplayText(null)).toBe("");
  expect(getFilterDisplayText(undefined)).toBe("");
});

test("getFilterDisplayText renders each numeric/text comparison type", () => {
  expect(getFilterDisplayText({ type: "equals", filter: 5 })).toBe("= 5");
  expect(getFilterDisplayText({ type: "notEqual", filter: 5 })).toBe("≠ 5");
  expect(getFilterDisplayText({ type: "lessThan", filter: 5 })).toBe("< 5");
  expect(getFilterDisplayText({ type: "lessThanOrEqual", filter: 5 })).toBe(
    "≤ 5",
  );
  expect(getFilterDisplayText({ type: "greaterThan", filter: 5 })).toBe("> 5");
  expect(getFilterDisplayText({ type: "greaterThanOrEqual", filter: 5 })).toBe(
    "≥ 5",
  );
});

test("getFilterDisplayText renders an inRange filter using both bounds", () => {
  expect(
    getFilterDisplayText({ type: "inRange", filter: 1, filterTo: 9 }),
  ).toBe("1 to 9");
});

test("getFilterDisplayText renders string-match types with quoted values", () => {
  expect(getFilterDisplayText({ type: "contains", filter: "foo" })).toBe(
    'contains "foo"',
  );
  expect(getFilterDisplayText({ type: "notContains", filter: "foo" })).toBe(
    '!contains "foo"',
  );
  expect(getFilterDisplayText({ type: "startsWith", filter: "foo" })).toBe(
    'starts with "foo"',
  );
  expect(getFilterDisplayText({ type: "endsWith", filter: "foo" })).toBe(
    'ends with "foo"',
  );
});

test("getFilterDisplayText renders blank/notBlank types", () => {
  expect(getFilterDisplayText({ type: "blank" })).toBe("is blank");
  expect(getFilterDisplayText({ type: "notBlank" })).toBe("is not blank");
});

test("getFilterDisplayText falls back to the raw filter value for unknown types", () => {
  expect(getFilterDisplayText({ type: "someNewType", filter: "abc" })).toBe(
    "abc",
  );
});

test("getFilterDisplayText returns empty string for an unknown type with no filter value", () => {
  expect(getFilterDisplayText({ type: "someNewType" })).toBe("");
});

test("getFilterDisplayText combines two conditions with the uppercased operator", () => {
  expect(
    getFilterDisplayText({
      operator: "and",
      condition1: { type: "greaterThan", filter: 1 },
      condition2: { type: "lessThan", filter: 9 },
    }),
  ).toBe("> 1 AND < 9");

  expect(
    getFilterDisplayText({
      operator: "or",
      condition1: { type: "equals", filter: 2 },
      condition2: { type: "equals", filter: 4 },
    }),
  ).toBe("= 2 OR = 4");
});
