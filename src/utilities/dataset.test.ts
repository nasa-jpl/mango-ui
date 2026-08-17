import { expect, test } from "vitest";
import { generateTestProduct } from "../test-utils/factories/product";
import { generateTestChartLayer } from "../test-utils/factories/view";
import { getFieldMetadataForLayer, getProductForLayer } from "./product";

test("getProductForLayer", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.dataset = "bar";
  layer.fields = ["field1"];

  const dataset1 = generateTestProduct();
  dataset1.mission = { id: "foo", label: "foo" };
  dataset1.id = "bar";
  dataset1.available_fields = [
    {
      name: "field1",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
    {
      name: "field2",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
  ];
  const dataset2 = generateTestProduct();
  dataset2.mission = { id: "foo", label: "foo" };
  dataset2.id = "bar";
  dataset2.available_fields = [
    {
      name: "x",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
    {
      name: "y",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
  ];
  const dataset3 = generateTestProduct();
  dataset3.mission = { id: "foo", label: "foo" };
  dataset3.id = "bat";
  dataset3.available_fields = [
    {
      name: "x",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
    {
      name: "y",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
  ];
  const dataset4 = generateTestProduct();
  dataset4.mission = { id: "cat", label: "cat" };
  dataset4.id = "bat";
  dataset4.available_fields = [
    {
      name: "x",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
    {
      name: "y",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
  ];
  expect(getProductForLayer(layer, [])).toBeUndefined();
  expect(getProductForLayer(layer, [dataset3])).toBeUndefined();
  expect(getProductForLayer(layer, [dataset1, dataset2, dataset3])).to.deep.eq(
    dataset1,
  );
});

test("getFieldMetadataForLayer", () => {
  const layer = generateTestChartLayer();
  layer.mission = "foo";
  layer.dataset = "bar";
  layer.fields = ["field1"];

  const dataset1 = generateTestProduct();
  dataset1.mission = { id: "foo", label: "foo" };
  dataset1.id = "bar";
  dataset1.available_fields = [
    {
      name: "field1",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
    {
      name: "field2",
      supported_aggregations: [],
      type: "float",
      unit: null,
      is_channel_id: false,
    },
  ];
  expect(getFieldMetadataForLayer("foo", layer, [])).toBeUndefined();
  expect(getFieldMetadataForLayer("field1", layer, [dataset1])).to.deep.eq(
    dataset1.available_fields[0],
  );
});
