import { describe, expect, it } from "vitest";
import { DataResponseDataEntry, Product, ProductField } from "../types/api";
import {
  fieldUsesPerRowUnit,
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
    (f) => f.name === "sensorvalue"
  );
  const sensorname = perRowUnitProduct.available_fields.find(
    (f) => f.name === "sensorname"
  );
  const unitField = perRowUnitProduct.available_fields.find(
    (f) => f.name === "unit"
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
    const data = [row({ sensorvalue: 12.5 }), row({ sensorvalue: 13, unit: "degK" })];
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
    (f) => f.name === "sensorvalue"
  );

  it("passes a static unit through unchanged (ignores row data)", () => {
    const field = makeField({ name: "sensor1value", unit: "V" });
    expect(resolveFieldUnit(field, staticUnitProduct, [row({ unit: "A" })])).toBe(
      "V"
    );
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
