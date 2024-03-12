import { expect, test } from "vitest";
import { generateTestChartLayer } from "../../e2e-tests/utilities/view";
import { applyIndividualTransform, applyLayerTransform } from "./view";

test("applyIndividualTransform", () => {
  expect(applyIndividualTransform(0, {})).toBe(0);
  expect(applyIndividualTransform(0, { add: 1 })).toBe(1);
  expect(applyIndividualTransform(0, { subtract: 1 })).toBe(-1);
  expect(applyIndividualTransform(0, { add: 1, subtract: 2 })).toBe(-1);
  expect(
    applyIndividualTransform(0, { add: 1, subtract: 2, multiply: 2 })
  ).toBe(-2);
  expect(
    applyIndividualTransform(0, { add: 1, subtract: 2, multiply: 2, divide: 2 })
  ).toBe(-1);
  expect(
    applyIndividualTransform(0, { add: 1, subtract: 2, multiply: 2, divide: 0 })
  ).toBe(-Infinity);
});

test("applyLayerTransform", () => {
  const chartLayer = generateTestChartLayer();
  expect(applyLayerTransform({ x: 0, y: 0 }, chartLayer)).to.deep.eq({
    x: 0,
    y: 0,
  });
  expect(
    applyLayerTransform({ x: 0, y: 0 }, { ...chartLayer, transforms: {} })
  ).to.deep.eq({
    x: 0,
    y: 0,
  });
  expect(
    applyLayerTransform(
      { x: 0, y: 0 },
      { ...chartLayer, transforms: { x: { add: 1 } } }
    )
  ).to.deep.eq({
    x: 1,
    y: 0,
  });
  expect(
    applyLayerTransform(
      { x: 0, y: 0 },
      { ...chartLayer, transforms: { x: { add: 1 }, y: { subtract: 1 } } }
    )
  ).to.deep.eq({
    x: 1,
    y: -1,
  });
});
