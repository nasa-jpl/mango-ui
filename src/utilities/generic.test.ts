import { expect, test } from "vitest";
import { ChartLayer } from "../types/view";
import {
  generateUUID,
  getDataLayerId,
  isAbortError,
  pluralize,
} from "./generic";

test("pluralize", () => {
  expect(pluralize(0)).toBe("s");
  expect(pluralize(1)).toBe("");
  expect(pluralize(10)).toBe("s");
});

test("getDataLayerId", () => {
  const layer: ChartLayer = {
    mission: "MISSION",
    dataset: "DATASET",
    fields: ["FIELD1", "FIELD2"],
    instrument: "INSTRUMENT",
    endTime: "",
    startTime: "",
    type: "line",
    version: "VERSION",
    id: "ID",
  };
  expect(getDataLayerId(layer)).toEqual(
    "MISSION_DATASET_FIELD1_FIELD2_INSTRUMENT_VERSION_ID"
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
