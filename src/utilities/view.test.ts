import { expect, test } from "vitest";
import { generateTestChartLayer } from "../../e2e-tests/utilities/view";
import {
  applyLayerTransform,
  applyLayerTransforms,
  formatYValue,
} from "./view";

const chartLayer1 = generateTestChartLayer();
const chartLayer2 = generateTestChartLayer();
const chartLayer3 = generateTestChartLayer();
const testData = [
  {
    layer: chartLayer1,
    points: [
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      { x: "2030-01-02T00:00:00.000Z", y: 1 },
      { x: "2030-01-03T00:00:00.000Z", y: 2 },
    ],
  },
  {
    layer: chartLayer2,
    points: [
      { x: "2030-01-01T00:00:00.000Z", y: 3 },
      { x: "2030-01-02T00:00:00.000Z", y: 4 },
      { x: "2030-01-03T00:00:00.000Z", y: 5 },
    ],
  },
  {
    layer: chartLayer3,
    points: [
      { x: "2031-01-01T00:00:00.000Z", y: 6 },
      { x: "2031-01-02T00:00:00.000Z", y: 7 },
      { x: "2031-01-03T00:00:00.000Z", y: 8 },
    ],
  },
];

test("applyLayerTransform", () => {
  expect(
    applyLayerTransform(
      0,
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      { add: 1, type: "self", axis: "y" },
      testData
    )
  ).toBe(1);
  expect(
    applyLayerTransform(
      new Date("2030-01-01T00:00:00.000Z").getTime(),
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      { add: 500, type: "self", axis: "y" },
      testData
    )
  ).toBe(new Date("2030-01-01T00:00:00.000Z").getTime() + 500);
  expect(
    applyLayerTransform(
      0,
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      { add: 1, subtract: 2, type: "self", axis: "y" },
      testData
    )
  ).toBe(-1);
  expect(
    applyLayerTransform(
      0,
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      { add: true, type: "derived", axis: "y", layerId: chartLayer2.id },
      testData,
      0
    )
  ).toBe(3);
});

test("applyLayerTransforms", () => {
  expect(
    applyLayerTransforms(
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      chartLayer1,
      testData,
      0
    )
  ).to.deep.eq({ x: "2030-01-01T00:00:00.000Z", y: 0 });
  expect(
    applyLayerTransforms(
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      { ...chartLayer1, transforms: [] },
      testData,
      0
    )
  ).to.deep.eq({ x: "2030-01-01T00:00:00.000Z", y: 0 });
  expect(
    applyLayerTransforms(
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      { ...chartLayer1, transforms: [{ type: "self", add: 1, axis: "y" }] },
      testData,
      0
    )
  ).to.deep.eq({ x: "2030-01-01T00:00:00.000Z", y: 1 });
  expect(
    applyLayerTransforms(
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      {
        ...chartLayer1,
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
      testData,
      0
    )
  ).to.deep.eq({ x: "2030-01-01T00:00:00.000Z", y: 3 });
  expect(
    applyLayerTransforms(
      { x: "2030-01-01T00:00:00.000Z", y: 0 },
      {
        ...chartLayer1,
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
      testData,
      0
    )
  ).to.deep.eq({ x: "2030-01-01T00:00:00.000Z", y: 1 });
});

test("formatYValue", () => {
  expect(formatYValue("10")).toEqual("10");
  expect(formatYValue(0)).toEqual("0");
  expect(formatYValue(10)).toEqual("10");
  expect(formatYValue(100000)).toEqual("100000");
  expect(formatYValue(0.00005000009)).toEqual("0.0000500001");
  expect(formatYValue(0.000480388100419)).toEqual("0.000480388");
  expect(formatYValue(199123812391823)).toEqual("1.99124e+14");
});
