import { expect, test } from "vitest";
import {
  generateTestChartLayer,
  generateTestDataEntry,
} from "../../e2e-tests/utilities/view";
import { TimeSeriesPoint } from "../types/view";
import {
  applyLayerTransform,
  applyLayerTransforms,
  findMatchingPoint,
  formatYValue,
} from "./view";

const chartLayer1 = generateTestChartLayer();
const chartLayer2 = generateTestChartLayer();
const chartLayer3 = generateTestChartLayer();
const dummyPoint = generateTestDataEntry();
const testData = [
  {
    layer: chartLayer1,
    pointsByField: {
      field1: [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 1,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 2,
          raw: dummyPoint,
          selected: false,
        },
      ],
    },
  },
  {
    layer: chartLayer2,
    pointsByField: {
      field1: [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 3,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 4,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 5,
          raw: dummyPoint,
          selected: false,
        },
      ],
    },
  },
  {
    layer: chartLayer3,
    pointsByField: {
      field1: [
        {
          x: "2031-01-01T00:00:00.000Z",
          y: 6,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2031-01-02T00:00:00.000Z",
          y: 7,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2031-01-03T00:00:00.000Z",
          y: 8,
          raw: dummyPoint,
          selected: false,
        },
      ],
    },
  },
];

test("applyLayerTransform", () => {
  const point: TimeSeriesPoint = {
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: generateTestDataEntry(),
    selected: false,
  };
  expect(
    applyLayerTransform(
      0,
      point,
      { add: 1, type: "self", axis: "y" },
      undefined,
      testData
    )
  ).toBe(1);
  expect(
    applyLayerTransform(
      new Date("2030-01-01T00:00:00.000Z").getTime(),
      point,
      { add: 500, type: "self", axis: "y" },
      undefined,
      testData
    )
  ).toBe(new Date("2030-01-01T00:00:00.000Z").getTime() + 500);
  expect(
    applyLayerTransform(
      0,
      point,
      { add: 1, subtract: 2, type: "self", axis: "y" },
      undefined,
      testData
    )
  ).toBe(-1);
  expect(
    applyLayerTransform(
      0,
      point,
      { add: true, type: "derived", axis: "y", layerId: chartLayer2.id },
      "field1",
      testData,
      0
    )
  ).toBe(3);
});

test("applyLayerTransforms", () => {
  const point: TimeSeriesPoint = {
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: generateTestDataEntry(),
    selected: false,
  };
  expect(
    applyLayerTransforms(point, chartLayer1, chartLayer1.fields[0], testData, 0)
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      { ...chartLayer1, transforms: [] },
      chartLayer1.fields[0],
      testData,
      0
    )
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      { ...chartLayer1, transforms: [{ type: "self", add: 1, axis: "y" }] },
      chartLayer1.fields[0],
      testData,
      0
    )
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 1,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      {
        ...chartLayer1,
        fields: ["field1"],
        transforms: [
          { type: "self", add: 1, axis: "y" },
          {
            type: "derived",
            layerId: chartLayer2.id,
            axis: "y",
            multiply: true,
          },
        ],
      },
      chartLayer1.fields[0],
      testData,
      0
    )
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 3,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      {
        ...chartLayer1,
        fields: ["field1"],
        transforms: [
          { type: "self", add: 1, axis: "y" },
          // Case where chartLayer1 is not time aligned with chartLayer3
          {
            type: "derived",
            layerId: chartLayer3.id,
            axis: "y",
            multiply: true,
          },
        ],
      },
      chartLayer1.fields[0],
      testData,
      0
    )
  ).to.deep.eq(null);
});

test("formatYValue", () => {
  expect(formatYValue("10")).toEqual("10");
  expect(formatYValue(0)).toEqual("0");
  expect(formatYValue(10)).toEqual("10");
  expect(formatYValue(100000)).toEqual("1e+5");
  expect(formatYValue(0.00005000009)).toEqual("5.000009e-5");
  expect(formatYValue(0.000480388100419)).toEqual("4.803881e-4");
  expect(formatYValue(199123812391823)).toEqual("1.991238e+14");
});

test("findMatchingPoint", () => {
  expect(findMatchingPoint([], 0, "2030-01-01T00:00:00.000Z")).to.eq(null);
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2030-01-01T00:00:00.000Z"
    )
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: dummyPoint,
    selected: false,
  });
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2030-01-01T00:00:00.000Z"
    )
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: dummyPoint,
    selected: false,
  });
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 1,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 2,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2030-01-02T00:00:00.000Z"
    )
  ).to.deep.eq({
    x: "2030-01-02T00:00:00.000Z",
    y: 1,
    raw: dummyPoint,
    selected: false,
  });
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 1,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 2,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2040-01-02T00:00:00.000Z"
    )
  ).to.deep.eq(null);
});
