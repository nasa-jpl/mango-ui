import { expect, test } from "vitest";
import { ChartLayer, TableLayer } from "../types/view";
import {
  generateUUID,
  getChartLayerId,
  getTableLayerId,
  isAbortError,
  pluralize,
} from "./generic";

test("pluralize", () => {
  expect(pluralize(0)).toBe("s");
  expect(pluralize(1)).toBe("");
  expect(pluralize(10)).toBe("s");
});

test("getChartLayerId", () => {
  const layer: ChartLayer = {
    mission: "MISSION",
    dataset: "DATASET",
    field: "FIELD",
    instrument: "INSTRUMENT",
    endTime: "",
    startTime: "",
    type: "line",
    version: "VERSION",
    id: "ID",
  };
  expect(getChartLayerId(layer)).toEqual(
    "MISSION_DATASET_FIELD_INSTRUMENT_VERSION_ID"
  );
});

test("getTableLayerId", () => {
  const layer: TableLayer = {
    mission: "MISSION",
    dataset: "DATASET",
    fields: ["FIELD1", "FIELD2"],
    instrument: "INSTRUMENT",
    endTime: "",
    startTime: "",
    version: "VERSION",
    id: "ID",
  };
  expect(getTableLayerId(layer)).toEqual(
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
