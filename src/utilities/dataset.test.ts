import { expect, test } from "vitest";
import { generateTestDataset } from "../../e2e-tests/utilities/dataset";
import { generateTestChartLayer } from "../../e2e-tests/utilities/view";
import { getDatasetForLayer, getFieldMetadataForLayer } from "./dataset";

test("getDatasetForLayer", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.datasetId = "bar";
  layer.field = "field1";

  const dataset1 = generateTestDataset();
  dataset1.mission = "foo";
  dataset1.id = "bar";
  dataset1.available_fields = [
    { name: "field1", supported_aggregations: [] },
    { name: "field2", supported_aggregations: [] },
  ];
  const dataset2 = generateTestDataset();
  dataset2.mission = "foo";
  dataset2.id = "bar";
  dataset2.available_fields = [
    { name: "x", supported_aggregations: [] },
    { name: "y", supported_aggregations: [] },
  ];
  const dataset3 = generateTestDataset();
  dataset3.mission = "foo";
  dataset3.id = "bat";
  dataset3.available_fields = [
    { name: "x", supported_aggregations: [] },
    { name: "y", supported_aggregations: [] },
  ];
  const dataset4 = generateTestDataset();
  dataset4.mission = "cat";
  dataset4.id = "bat";
  dataset4.available_fields = [
    { name: "x", supported_aggregations: [] },
    { name: "y", supported_aggregations: [] },
  ];
  expect(getDatasetForLayer(layer, [])).to.be.undefined;
  expect(getDatasetForLayer(layer, [dataset2])).to.be.undefined;
  expect(getDatasetForLayer(layer, [dataset1, dataset2, dataset3])).to.deep.eq(
    dataset1
  );
});

test("getFieldMetadataForLayer", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.datasetId = "bar";
  layer.field = "field1";

  const dataset1 = generateTestDataset();
  dataset1.mission = "foo";
  dataset1.id = "bar";
  dataset1.available_fields = [
    { name: "field1", supported_aggregations: [] },
    { name: "field2", supported_aggregations: [] },
  ];
  expect(getFieldMetadataForLayer(layer, [])).to.be.undefined;
  expect(getFieldMetadataForLayer(layer, [dataset1])).to.deep.eq(
    dataset1.available_fields[0]
  );
});
