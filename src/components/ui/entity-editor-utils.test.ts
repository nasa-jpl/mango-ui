import { expect, test } from "vitest";
import { DataResponse, DataResponseDataEntry } from "../../types/api";
import { ChartEntity, DataLayer, Entity as EntityType } from "../../types/view";
import type { SelectedProduct } from "./EntityEditor";
import {
  countSubsetVersionsInDataResponse,
  extractEntitySelectedProducts,
  getLabelForSelectedProductOrLayer,
  getMatchingSelectedProductForLayer,
  isSelectedProductComplete,
} from "./entity-editor-utils";

function dataEntry(
  subsetVersion?: number | string | null,
): DataResponseDataEntry {
  const entry: Record<string, unknown> = { timestamp: "t" };
  if (subsetVersion !== undefined) {
    entry.subset_version = { value: subsetVersion };
  }
  return entry as unknown as DataResponseDataEntry;
}

function response(entries: DataResponseDataEntry[]): DataResponse {
  return { data: entries } as unknown as DataResponse;
}

function selectedProduct(
  overrides: Partial<SelectedProduct> = {},
): SelectedProduct {
  return {
    id: "product-1",
    mission: "M",
    instrument: "I",
    dataset: "D",
    fields: ["temp"],
    version: "1",
    ...overrides,
  } as SelectedProduct;
}

function dataLayer(overrides: Partial<DataLayer> = {}): DataLayer {
  return {
    id: "layer-1",
    mission: "M",
    instrument: "I",
    dataset: "D",
    fields: ["temp"],
    version: "1",
    endTime: "",
    startTime: "",
    ...overrides,
  } as DataLayer;
}

// --- getLabelForSelectedProductOrLayer --------------------------------------

test("getLabelForSelectedProductOrLayer builds a full label with channels and filter", () => {
  const label = getLabelForSelectedProductOrLayer(
    selectedProduct({
      fields: ["a", "b"],
      channels: [{ id: "c1", value: "v1" }],
      version: "3",
      filter: ["f=1", "g=2"],
    }),
  );
  expect(label).toBe("M I D a, b (c1: v1) (v3) filter: f=1, g=2");
});

test("getLabelForSelectedProductOrLayer joins multiple channels with a space", () => {
  const label = getLabelForSelectedProductOrLayer(
    selectedProduct({
      channels: [
        { id: "a", value: "1" },
        { id: "b", value: "2" },
      ],
    }),
  );
  expect(label).toContain("(a: 1) (b: 2)");
});

test("getLabelForSelectedProductOrLayer omits channels and filter segments when absent", () => {
  expect(getLabelForSelectedProductOrLayer(selectedProduct())).toBe(
    "M I D temp  (v1) ",
  );
});

test("getLabelForSelectedProductOrLayer omits the filter segment for an empty filter array", () => {
  const label = getLabelForSelectedProductOrLayer(
    selectedProduct({ filter: [] }),
  );
  expect(label).not.toContain("filter:");
  expect(label).toBe("M I D temp  (v1) ");
});

test("getLabelForSelectedProductOrLayer prefers the explicit fields argument over thing.fields", () => {
  const label = getLabelForSelectedProductOrLayer(
    selectedProduct({ fields: ["ignored"] }),
    ["chosen"],
  );
  expect(label).toContain(" D chosen ");
  expect(label).not.toContain("ignored");
});

// --- getMatchingSelectedProductForLayer -------------------------------------

test("getMatchingSelectedProductForLayer returns the product whose label matches the layer", () => {
  const match = selectedProduct({ id: "match" });
  const other = selectedProduct({ id: "other", dataset: "OTHER" });
  const result = getMatchingSelectedProductForLayer(dataLayer(), [
    other,
    match,
  ]);
  expect(result?.id).toBe("match");
});

test("getMatchingSelectedProductForLayer returns undefined when nothing matches", () => {
  const result = getMatchingSelectedProductForLayer(dataLayer(), [
    selectedProduct({ dataset: "OTHER" }),
  ]);
  expect(result).toBeUndefined();
});

test("getMatchingSelectedProductForLayer applies the fields override to both sides", () => {
  // Product and layer each have their own (different) fields, and both differ from the
  // override, so a match can only occur when the override replaces BOTH sides.
  const product = selectedProduct({ id: "p", fields: ["x"] });
  const layer = dataLayer({ fields: ["y"] });
  // Without an override the natural labels differ (x vs y) => no match.
  expect(getMatchingSelectedProductForLayer(layer, [product])).toBeUndefined();
  // With an override both labels use ["a"], producing a match.
  expect(getMatchingSelectedProductForLayer(layer, [product], ["a"])?.id).toBe(
    "p",
  );
});

// --- countSubsetVersionsInDataResponse --------------------------------------

test("countSubsetVersionsInDataResponse returns 0 for missing or malformed responses", () => {
  expect(countSubsetVersionsInDataResponse(null)).toBe(0);
  expect(countSubsetVersionsInDataResponse(undefined)).toBe(0);
  // data.data is not an array
  expect(
    countSubsetVersionsInDataResponse({
      data: null,
    } as unknown as DataResponse),
  ).toBe(0);
  expect(countSubsetVersionsInDataResponse(response([]))).toBe(0);
});

test("countSubsetVersionsInDataResponse returns 0 when no entry carries a subset_version", () => {
  expect(
    countSubsetVersionsInDataResponse(response([dataEntry(), dataEntry()])),
  ).toBe(0);
});

test("countSubsetVersionsInDataResponse counts distinct values and ignores duplicates", () => {
  expect(
    countSubsetVersionsInDataResponse(
      response([dataEntry(2), dataEntry(2), dataEntry(10)]),
    ),
  ).toBe(2);
});

test("countSubsetVersionsInDataResponse ignores null/undefined but counts falsy values like 0", () => {
  expect(
    countSubsetVersionsInDataResponse(
      response([dataEntry(null), dataEntry(), dataEntry(0)]),
    ),
  ).toBe(1);
});

test("countSubsetVersionsInDataResponse returns 0 when every value is null", () => {
  expect(
    countSubsetVersionsInDataResponse(
      response([dataEntry(null), dataEntry(null)]),
    ),
  ).toBe(0);
});

test("countSubsetVersionsInDataResponse coerces to string so 2 and '2' are one version", () => {
  expect(
    countSubsetVersionsInDataResponse(response([dataEntry(2), dataEntry("2")])),
  ).toBe(1);
});

// --- isSelectedProductComplete ----------------------------------------------

test("isSelectedProductComplete is true when all required fields are present", () => {
  expect(isSelectedProductComplete(selectedProduct())).toBe(true);
});

test("isSelectedProductComplete is false when any single required field is missing", () => {
  expect(isSelectedProductComplete(selectedProduct({ mission: "" }))).toBe(
    false,
  );
  expect(isSelectedProductComplete(selectedProduct({ instrument: "" }))).toBe(
    false,
  );
  expect(isSelectedProductComplete(selectedProduct({ dataset: "" }))).toBe(
    false,
  );
  expect(isSelectedProductComplete(selectedProduct({ fields: [] }))).toBe(
    false,
  );
  expect(isSelectedProductComplete(selectedProduct({ version: "" }))).toBe(
    false,
  );
});

// --- extractEntitySelectedProducts ------------------------------------------

test("extractEntitySelectedProducts maps each layer, copying fields and generating ids", () => {
  const entity = {
    type: "chart",
    layers: [
      dataLayer({
        channels: [{ id: "c", value: "1" }],
        filter: ["f=1"],
      }),
      dataLayer({ id: "layer-2", fields: ["p"] }),
    ],
  } as unknown as ChartEntity as EntityType;

  const result = extractEntitySelectedProducts(entity);

  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({
    mission: "M",
    instrument: "I",
    dataset: "D",
    fields: ["temp"],
    version: "1",
    channels: [{ id: "c", value: "1" }],
    filter: ["f=1"],
  });
  expect(typeof result[0].id).toBe("string");
  expect(result[0].id.length).toBeGreaterThan(0);
  // A fresh id is generated per layer, not copied from the layer.
  expect(result[0].id).not.toBe("layer-1");
  expect(result[1].fields).toEqual(["p"]);
});

test("extractEntitySelectedProducts includes filter only when it is an array", () => {
  const withFilter = extractEntitySelectedProducts({
    type: "chart",
    layers: [dataLayer({ filter: ["f=1"] })],
  } as unknown as ChartEntity as EntityType);
  expect(withFilter[0]).toHaveProperty("filter", ["f=1"]);

  const withoutFilter = extractEntitySelectedProducts({
    type: "chart",
    layers: [dataLayer()],
  } as unknown as ChartEntity as EntityType);
  expect(withoutFilter[0]).not.toHaveProperty("filter");
});

test("extractEntitySelectedProducts returns [] when the entity has no layers", () => {
  expect(
    extractEntitySelectedProducts({ type: "chart" } as unknown as EntityType),
  ).toEqual([]);
});
