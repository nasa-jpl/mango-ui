import { expect, test } from "vitest";
import { DataLayer } from "../types/view";
import { generateUUID, getLayerId, isAbortError, pluralize } from "./generic";

test("pluralize", () => {
  expect(pluralize(0)).toBe("s");
  expect(pluralize(1)).toBe("");
  expect(pluralize(10)).toBe("s");
});

test("getLayerId", () => {
  const layer: DataLayer = {
    mission: "MISSION",
    dataset: "DATASET",
    field: "FIELD",
    instrument: "INSTRUMENT",
    endTime: "",
    startTime: "",
    version: "VERSION",
    id: "ID",
  };
  expect(getLayerId(layer)).toEqual(
    "MISSION_DATASET_FIELD_INSTRUMENT_VERSION_ID"
  );
});

test("isAbortError", () => {
  const error = new Error();
  expect(isAbortError(error)).toBe(false);

  const abortError = new Error();
  abortError.name = "AbortError";
  expect(isAbortError(abortError)).toBe(true);
});

test("generateUUID", () => {
  expect(generateUUID()).to.not.eq(generateUUID());
});
