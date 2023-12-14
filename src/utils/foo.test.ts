import { expect, test } from "vitest";
import { pluralize } from "./foo";

test("pluralize", () => {
  expect(pluralize(0)).toBe("s");
  expect(pluralize(1)).toBe("");
  expect(pluralize(10)).toBe("s");
});
