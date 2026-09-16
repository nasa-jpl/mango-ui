import { describe, expect, it, test } from "vitest";
import {
  generateTestDataset,
  generateTestProduct,
} from "../test-utils/factories/product";
import { generateTestChartLayer } from "../test-utils/factories/view";
import { DataResponseDataEntry, Product, ProductField } from "../types/api";
import {
  applyFieldThresholds,
  fieldUsesPerRowUnit,
  getDatasetForLayer,
  getFieldMetadataForLayer,
  getProductForLayer,
  productHasPerRowUnitField,
  readPerRowUnit,
  resolveFieldUnit,
} from "./product";

function makeField(overrides: Partial<ProductField> = {}): ProductField {
  return {
    is_channel_id: false,
    name: "sensorvalue",
    supported_aggregations: [],
    type: "float",
    unit: null,
    ...overrides,
  };
}

function makeProduct(fields: ProductField[]): Product {
  return {
    available_fields: fields,
    available_resolutions: [],
    available_versions: [],
    datasets: [],
    description: "",
    full_id: "GRACEFO_IHK1A",
    id: "IHK1A",
    instruments: [],
    mission: { id: "GRACEFO", label: "GRACE-FO" },
    processing_level: "1A",
    query_result_limit: 100000,
    timestamp_field: "timestamp",
  };
}

function row(fields: Record<string, string | number>): DataResponseDataEntry {
  const entry: Record<string, unknown> = { timestamp: "2026-01-01T00:00:00Z" };
  for (const [key, value] of Object.entries(fields)) {
    entry[key] = { value };
  }
  return entry as DataResponseDataEntry;
}

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

// A case-2 product (IHK-like): unit lives in a per-row `unit` column.
const perRowUnitProduct = makeProduct([
  makeField({ name: "sensorname", is_channel_id: true, type: "str" }),
  makeField({ name: "sensorvalue", unit: null }),
  makeField({ name: "unit", type: "str", unit: null }),
]);

// A case-1 product: unit is static on the field.
const staticUnitProduct = makeProduct([
  makeField({ name: "sensor1value", unit: "V" }),
  makeField({ name: "sensor2value", unit: "degK" }),
]);

describe("productHasPerRowUnitField", () => {
  it("is true when a `unit` field exists", () => {
    expect(productHasPerRowUnitField(perRowUnitProduct)).toBe(true);
  });

  it("is false for a product without a `unit` field", () => {
    expect(productHasPerRowUnitField(staticUnitProduct)).toBe(false);
  });

  it("is false for null/undefined", () => {
    expect(productHasPerRowUnitField(null)).toBe(false);
    expect(productHasPerRowUnitField(undefined)).toBe(false);
  });
});

describe("fieldUsesPerRowUnit", () => {
  const sensorvalue = perRowUnitProduct.available_fields.find(
    (f) => f.name === "sensorvalue",
  );
  const sensorname = perRowUnitProduct.available_fields.find(
    (f) => f.name === "sensorname",
  );
  const unitField = perRowUnitProduct.available_fields.find(
    (f) => f.name === "unit",
  );

  it("is true for the measurement field with a null static unit", () => {
    expect(fieldUsesPerRowUnit(sensorvalue, perRowUnitProduct)).toBe(true);
  });

  it("is false for the channel_id field", () => {
    expect(fieldUsesPerRowUnit(sensorname, perRowUnitProduct)).toBe(false);
  });

  it("is false for the `unit` column itself", () => {
    expect(fieldUsesPerRowUnit(unitField, perRowUnitProduct)).toBe(false);
  });

  it("is false when the field has a static unit", () => {
    const withUnit = makeField({ name: "sensorvalue", unit: "V" });
    expect(fieldUsesPerRowUnit(withUnit, perRowUnitProduct)).toBe(false);
  });

  it("is false for null-unit sibling fields that are not the measurement", () => {
    // These are null-unit and non-channel, but must NOT resolve a per-row unit.
    for (const name of ["sensortype", "qualflg", "gracefo_id", "time_ref"]) {
      const f = makeField({ name, unit: null, type: "str" });
      expect(fieldUsesPerRowUnit(f, perRowUnitProduct)).toBe(false);
    }
  });

  it("is true for OFFRED-style value_* measurement fields", () => {
    const offred = makeProduct([
      makeField({ name: "pcf_name", is_channel_id: true, type: "str" }),
      makeField({ name: "value_float", unit: null, type: "float" }),
      makeField({ name: "value_int", unit: null, type: "int" }),
      makeField({ name: "value_str", unit: null, type: "str" }),
      makeField({ name: "obt_type", unit: null, type: "str" }),
      makeField({ name: "unit", unit: null, type: "str" }),
    ]);
    const byName = (n: string) =>
      offred.available_fields.find((f) => f.name === n);
    expect(fieldUsesPerRowUnit(byName("value_float"), offred)).toBe(true);
    expect(fieldUsesPerRowUnit(byName("value_int"), offred)).toBe(true);
    expect(fieldUsesPerRowUnit(byName("value_str"), offred)).toBe(true);
    // Non-measurement null-unit sibling stays excluded.
    expect(fieldUsesPerRowUnit(byName("obt_type"), offred)).toBe(false);
  });

  it("is false when the product has no `unit` column", () => {
    const field = staticUnitProduct.available_fields[0];
    expect(fieldUsesPerRowUnit(field, staticUnitProduct)).toBe(false);
  });

  it("is false for null field/product", () => {
    expect(fieldUsesPerRowUnit(null, perRowUnitProduct)).toBe(false);
    expect(fieldUsesPerRowUnit(sensorvalue, null)).toBe(false);
  });
});

describe("readPerRowUnit", () => {
  it("returns the unit from the first row that carries one", () => {
    const data = [
      row({ sensorvalue: 12.5, unit: "V" }),
      row({ sensorvalue: 13.0, unit: "V" }),
    ];
    expect(readPerRowUnit(data)).toBe("V");
  });

  it("skips leading rows with no unit", () => {
    const data = [
      row({ sensorvalue: 12.5 }),
      row({ sensorvalue: 13, unit: "degK" }),
    ];
    expect(readPerRowUnit(data)).toBe("degK");
  });

  it("coerces numeric unit values to string", () => {
    expect(readPerRowUnit([row({ unit: 5 })])).toBe("5");
  });

  it("returns empty string for empty/nullish data", () => {
    expect(readPerRowUnit([])).toBe("");
    expect(readPerRowUnit(null)).toBe("");
    expect(readPerRowUnit(undefined)).toBe("");
  });

  it("returns empty string when no row carries a unit", () => {
    expect(readPerRowUnit([row({ sensorvalue: 1 })])).toBe("");
  });
});

describe("resolveFieldUnit", () => {
  const sensorvalue = perRowUnitProduct.available_fields.find(
    (f) => f.name === "sensorvalue",
  );

  it("passes a static unit through unchanged (ignores row data)", () => {
    const field = makeField({ name: "sensor1value", unit: "V" });
    expect(
      resolveFieldUnit(field, staticUnitProduct, [row({ unit: "A" })]),
    ).toBe("V");
  });

  it("resolves the per-row unit for a case-2 measurement field", () => {
    const data = [row({ sensorvalue: 12.5, unit: "degK" })];
    expect(resolveFieldUnit(sensorvalue, perRowUnitProduct, data)).toBe("degK");
  });

  it("returns empty string when a per-row unit is not present in the data", () => {
    expect(resolveFieldUnit(sensorvalue, perRowUnitProduct, [])).toBe("");
  });

  it("returns empty string for a unitless field", () => {
    const field = makeField({ name: "flag", unit: null, type: "int" });
    expect(resolveFieldUnit(field, staticUnitProduct, [])).toBe("");
  });
});

const makeThresholdField = (
  qc_thresholds?: ProductField["qc_thresholds"],
): ProductField => makeField({ name: "temp", qc_thresholds });

// The DataResponseDataEntry index signature and its `timestamp: string` member are a
// declared intersection that object literals can't satisfy directly, so cast through unknown.
const makeEntry = (value: number): DataResponseDataEntry =>
  ({
    timestamp: "2021-06-01T00:00:00Z",
    temp: { value },
  }) as unknown as DataResponseDataEntry;

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
  expect(
    applyFieldThresholds(makeThresholdField(undefined), makeEntry(5)),
  ).toEqual(NO_VIOLATIONS);
});

// Non-zero bounds are important: they distinguish `x ?? y` from `x && y` (a zero
// lower bound would collapse both) and let exact-boundary values probe `<` vs `<=`.
const boundedField = () =>
  makeThresholdField([
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
  const field = makeThresholdField([{ limits: { lower: 10, upper: 100 } }]);
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
  const field = makeThresholdField([{ warnings: { lower: 20, upper: 90 } }]);
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
  const sinceMatch = makeThresholdField([
    {
      effective_since: "2020-01-01",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  // since <= timestamp → in range → violation computed.
  expect(applyFieldThresholds(sinceMatch, makeEntry(0)).limits.lower).toBe(
    true,
  );

  const sinceMiss = makeThresholdField([
    {
      effective_since: "2099-01-01",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  // since > timestamp → out of range → no matching config → all-clear.
  expect(applyFieldThresholds(sinceMiss, makeEntry(0))).toEqual(NO_VIOLATIONS);

  const untilMatch = makeThresholdField([
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
  const sinceEqual = makeThresholdField([
    {
      effective_since: "2021-06-01T00:00:00Z",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  expect(applyFieldThresholds(sinceEqual, makeEntry(0)).limits.lower).toBe(
    true,
  );

  const untilEqual = makeThresholdField([
    {
      effective_until: "2021-06-01T00:00:00Z",
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  expect(applyFieldThresholds(untilEqual, makeEntry(0)).limits.lower).toBe(
    true,
  );

  // until < timestamp → out of range → all-clear.
  const untilMiss = makeThresholdField([
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
  const field = makeThresholdField([
    {
      effective_since: "2099-01-01", // would exclude 2021-06-01 if it were honored
      effective_until: "2099-12-31", // >= timestamp → true, overwrites the since result
      limits: { lower: 100 },
    } as unknown as NonNullable<ProductField["qc_thresholds"]>[number],
  ]);
  // Despite effective_since being in the future, the threshold still matches.
  expect(applyFieldThresholds(field, makeEntry(0)).limits.lower).toBe(true);
});
