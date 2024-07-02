import { expect, test } from "vitest";
import { generateTestProduct } from "../../e2e-tests/utilities/product";
import { generateTestChartLayer } from "../../e2e-tests/utilities/view";
import { getFieldMetadataForLayer, getProductForLayer } from "./product";

test("getProductForLayer", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.dataset = "bar";
  layer.field = "field1";

  const dataset1 = generateTestProduct();
  dataset1.mission = "foo";
  dataset1.id = "bar";
  dataset1.available_fields = [
    { name: "field1", supported_aggregations: [], type: "float", unit: null },
    { name: "field2", supported_aggregations: [], type: "float", unit: null },
  ];
  const dataset2 = generateTestProduct();
  dataset2.mission = "foo";
  dataset2.id = "bar";
  dataset2.available_fields = [
    { name: "x", supported_aggregations: [], type: "float", unit: null },
    { name: "y", supported_aggregations: [], type: "float", unit: null },
  ];
  const dataset3 = generateTestProduct();
  dataset3.mission = "foo";
  dataset3.id = "bat";
  dataset3.available_fields = [
    { name: "x", supported_aggregations: [], type: "float", unit: null },
    { name: "y", supported_aggregations: [], type: "float", unit: null },
  ];
  const dataset4 = generateTestProduct();
  dataset4.mission = "cat";
  dataset4.id = "bat";
  dataset4.available_fields = [
    { name: "x", supported_aggregations: [], type: "float", unit: null },
    { name: "y", supported_aggregations: [], type: "float", unit: null },
  ];
  expect(getProductForLayer(layer, [])).to.be.undefined;
  expect(getProductForLayer(layer, [dataset2])).to.be.undefined;
  expect(getProductForLayer(layer, [dataset1, dataset2, dataset3])).to.deep.eq(
    dataset1
  );
});

test("getFieldMetadataForLayer", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.dataset = "bar";
  layer.field = "field1";

  const dataset1 = generateTestProduct();
  dataset1.mission = "foo";
  dataset1.id = "bar";
  dataset1.available_fields = [
    { name: "field1", supported_aggregations: [], type: "float", unit: null },
    { name: "field2", supported_aggregations: [], type: "float", unit: null },
  ];
  expect(getFieldMetadataForLayer(layer, [])).to.be.undefined;
  expect(getFieldMetadataForLayer(layer, [dataset1])).to.deep.eq(
    dataset1.available_fields[0]
  );
});
