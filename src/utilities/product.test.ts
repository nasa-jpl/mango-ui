import { expect, test } from "vitest";
import {
  generateTestDataset,
  generateTestProduct,
} from "../test-utils/factories/product";
import { generateTestChartLayer } from "../test-utils/factories/view";
import { DataResponseDataEntry, ProductField } from "../types/api";
import {
  applyFieldThresholds,
  getDatasetForLayer,
  getFieldMetadataForLayer,
  getProductForLayer,
} from "./product";

test("getProductForLayer matches on BOTH mission and dataset", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.dataset = "bar";

  // Dataset id matches but mission does NOT — must not be returned.
  const wrongMission = generateTestProduct();
  wrongMission.mission = { id: "other", label: "other" };
  wrongMission.id = "bar";

  // Mission matches but dataset id does NOT — must not be returned.
  const wrongDataset = generateTestProduct();
  wrongDataset.mission = { id: "foo", label: "foo" };
  wrongDataset.id = "baz";

  const match = generateTestProduct();
  match.mission = { id: "foo", label: "foo" };
  match.id = "bar";

  expect(getProductForLayer(layer, [wrongMission])).toBeUndefined();
  expect(getProductForLayer(layer, [wrongDataset])).toBeUndefined();
  // `match` is intentionally not first, so returning the first element would fail.
  expect(getProductForLayer(layer, [wrongMission, wrongDataset, match])).toBe(
    match,
  );
});

test("getFieldMetadataForLayer returns the requested field, not merely the first", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.dataset = "bar";

  const product = generateTestProduct();
  product.mission = { id: "foo", label: "foo" };
  product.id = "bar";
  product.available_fields = [
    {
      name: "first",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
    {
      name: "second",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
  ];

  // Requesting the SECOND field must not return the first.
  expect(getFieldMetadataForLayer("second", layer, [product])?.name).toBe(
    "second",
  );
  // Unknown field → undefined.
  expect(getFieldMetadataForLayer("missing", layer, [product])).toBeUndefined();
  // No matching product → undefined (guard branch).
  const otherLayer = generateTestChartLayer();
  otherLayer.mission = "nope";
  otherLayer.dataset = "nope";
  expect(
    getFieldMetadataForLayer("first", otherLayer, [product]),
  ).toBeUndefined();
});

test("getDatasetForLayer matches on version and instrument", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.dataset = "bar";
  layer.version = "04";
  layer.instrument = "C";

  const product = generateTestProduct();
  product.mission = { id: "foo", label: "foo" };
  product.id = "bar";
  const dsC = generateTestDataset();
  dsC.version_id = "04";
  dsC.instrument_id = "C";
  const dsD = generateTestDataset();
  dsD.version_id = "04";
  dsD.instrument_id = "D";
  product.datasets = [dsD, dsC];

  // Must pick the instrument-matching dataset, not just the first.
  expect(getDatasetForLayer(layer, [product])).toBe(dsC);

  // Instrument override argument takes precedence over layer.instrument.
  expect(getDatasetForLayer(layer, [product], "D")).toBe(dsD);

  // Version mismatch → undefined.
  const wrongVersionLayer = { ...layer, version: "99" };
  expect(getDatasetForLayer(wrongVersionLayer, [product])).toBeUndefined();

  // No matching product → undefined (early guard).
  const noProductLayer = generateTestChartLayer();
  noProductLayer.mission = "none";
  noProductLayer.dataset = "none";
  expect(getDatasetForLayer(noProductLayer, [product])).toBeUndefined();
});

const makeField = (
  qc_thresholds?: ProductField["qc_thresholds"],
): ProductField => ({
  name: "temp",
  supported_aggregations: [],
  type: "float",
  unit: null,
  is_channel_id: false,
  qc_thresholds,
});

const makeEntry = (value: number): DataResponseDataEntry => ({
  timestamp: "2021-06-01T00:00:00Z",
  temp: { value },
});

const NO_VIOLATIONS = {
  limits: { lower: false, lower_value: null, upper: false, upper_value: null },
  warnings: {
    lower: false,
    lower_value: null,
    upper: false,
    upper_value: null,
  },
};

test("applyFieldThresholds returns an all-clear result when the field has no thresholds", () => {
  expect(applyFieldThresholds(makeField(undefined), makeEntry(5))).toEqual(
    NO_VIOLATIONS,
  );
});

// Non-zero bounds are important: they distinguish `x ?? y` from `x && y` (a zero
// lower bound would collapse both) and let exact-boundary values probe `<` vs `<=`.
const boundedField = () =>
  makeField([
    { limits: { lower: 10, upper: 100 }, warnings: { lower: 20, upper: 90 } },
  ]);

test("applyFieldThresholds flags lower/upper limit and warning violations", () => {
  const field = boundedField();

  // Below every lower bound.
  expect(applyFieldThresholds(field, makeEntry(5))).toEqual({
    limits: { lower: true, lower_value: 10, upper: false, upper_value: 100 },
    warnings: { lower: true, lower_value: 20, upper: false, upper_value: 90 },
  });

  // Above every upper bound.
  expect(applyFieldThresholds(field, makeEntry(150))).toEqual({
    limits: { lower: false, lower_value: 10, upper: true, upper_value: 100 },
    warnings: { lower: false, lower_value: 20, upper: true, upper_value: 90 },
  });

  // Comfortably within all bounds.
  expect(applyFieldThresholds(field, makeEntry(50))).toEqual({
    limits: { lower: false, lower_value: 10, upper: false, upper_value: 100 },
    warnings: { lower: false, lower_value: 20, upper: false, upper_value: 90 },
  });
});

test("applyFieldThresholds boundary values are inclusive-safe (violation is strict)", () => {
  const field = boundedField();
  // value === bound must NOT be a violation (distinguishes `<`/`>` from `<=`/`>=`).
  expect(applyFieldThresholds(field, makeEntry(10)).limits.lower).toBe(false);
  expect(applyFieldThresholds(field, makeEntry(100)).limits.upper).toBe(false);
  expect(applyFieldThresholds(field, makeEntry(20)).warnings.lower).toBe(false);
  expect(applyFieldThresholds(field, makeEntry(90)).warnings.upper).toBe(false);
});

test("applyFieldThresholds treats a missing warnings block as no-op", () => {
  // limits present, warnings absent → warnings default to false/null.
  const field = makeField([{ limits: { lower: 10, upper: 100 } }]);
  expect(applyFieldThresholds(field, makeEntry(5))).toEqual({
    limits: { lower: true, lower_value: 10, upper: false, upper_value: 100 },
    warnings: {
      lower: false,
      lower_value: null,
      upper: false,
      upper_value: null,
    },
  });
});

test("applyFieldThresholds treats a missing limits block as no-op", () => {
  // warnings present, limits absent → limits default to false/null.
  const field = makeField([{ warnings: { lower: 20, upper: 90 } }]);
  expect(applyFieldThresholds(field, makeEntry(5))).toEqual({
    limits: {
      lower: false,
      lower_value: null,
      upper: false,
      upper_value: null,
    },
    warnings: { lower: true, lower_value: 20, upper: false, upper_value: 90 },
  });
});

test("applyFieldThresholds honors effective_since / effective_until windows", () => {
  // entry timestamp is 2021-06-01.
  const sinceMatch = makeField([
    {
      effective_since: "2020-01-01",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  // since <= timestamp → in range → violation computed.
  expect(applyFieldThresholds(sinceMatch, makeEntry(0)).limits.lower).toBe(
    true,
  );

  const sinceMiss = makeField([
    {
      effective_since: "2099-01-01",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  // since > timestamp → out of range → no matching config → all-clear.
  expect(applyFieldThresholds(sinceMiss, makeEntry(0))).toEqual(NO_VIOLATIONS);

  const untilMatch = makeField([
    {
      effective_until: "2099-01-01",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  // until >= timestamp → in range.
  expect(applyFieldThresholds(untilMatch, makeEntry(0)).limits.lower).toBe(
    true,
  );

  // Exact-boundary dates: since === timestamp and until === timestamp must both
  // still match (inclusive), distinguishing `<=`/`>=` from strict `<`/`>`.
  const sinceEqual = makeField([
    {
      effective_since: "2021-06-01T00:00:00Z",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  expect(applyFieldThresholds(sinceEqual, makeEntry(0)).limits.lower).toBe(
    true,
  );

  const untilEqual = makeField([
    {
      effective_until: "2021-06-01T00:00:00Z",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  expect(applyFieldThresholds(untilEqual, makeEntry(0)).limits.lower).toBe(
    true,
  );

  // until < timestamp → out of range → all-clear.
  const untilMiss = makeField([
    {
      effective_until: "2000-01-01",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  expect(applyFieldThresholds(untilMiss, makeEntry(0))).toEqual(NO_VIOLATIONS);
});

// Characterization (see IMPACT.md D3): when BOTH effective_since and effective_until
// are present, the current implementation lets the `effective_until` check OVERWRITE the
// `effective_since` result, so `effective_since` is effectively ignored. This test pins
// that current (suspect) behavior; it is NOT an endorsement.
test("applyFieldThresholds: with both dates set, effective_until alone decides the match (current behavior)", () => {
  const field = makeField([
    {
      effective_since: "2099-01-01", // would exclude 2021-06-01 if it were honored
      effective_until: "2099-12-31", // >= timestamp → true, overwrites the since result
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  // Despite effective_since being in the future, the threshold still matches.
  expect(applyFieldThresholds(field, makeEntry(0)).limits.lower).toBe(true);
});
