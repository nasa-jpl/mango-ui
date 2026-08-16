import { expect, test } from "vitest";
import { isWithinSubsetVersionMaxRange } from "./time";

test("isWithinSubsetVersionMaxRange", () => {
  expect(
    isWithinSubsetVersionMaxRange(
      "2022-06-01T00:00:00.000Z",
      "2022-06-03T00:00:00.000Z"
    )
  ).toBe(true);
  expect(
    isWithinSubsetVersionMaxRange(
      "2022-06-01T00:00:00.000Z",
      "2022-06-06T00:00:00.000Z"
    )
  ).toBe(true);
  expect(
    isWithinSubsetVersionMaxRange(
      "2022-06-01T00:00:00.000Z",
      "2022-06-06T00:00:00.001Z"
    )
  ).toBe(false);
  expect(
    isWithinSubsetVersionMaxRange(
      "2022-06-01T00:00:00.000Z",
      "2022-06-08T00:00:00.000Z"
    )
  ).toBe(false);
});
