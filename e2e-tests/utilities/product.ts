import { Dataset, Product } from "../../src/types/api";
import { generateUniqueName } from "./generic";

export const generateTestDataset = (): Dataset => {
  return {
    data_begin: "2022-01-01T00:00:00.037430+00:00",
    data_end: "2023-01-01T00:00:00.037430+00:00",
    dataset_id: generateUniqueName(),
    instrument_id: "C",
    last_updated: "2024-01-01T00:00:00.037430+00:00",
    product_id: generateUniqueName(),
    version_id: "04",
  };
};

export const generateTestProduct = (): Product => {
  return {
    available_fields: [
      {
        name: generateUniqueName(),
        supported_aggregations: [{ field_name: "name_avg", type: "avg" }],
        unit: null,
        type: "float",
        is_channel_id: false,
      },
      {
        name: generateUniqueName(),
        supported_aggregations: [
          { field_name: "name_min", type: "min" },
          { field_name: "name_max", type: "max" },
        ],
        unit: "m/s",
        type: "float",
        is_channel_id: false,
      },
    ],
    available_resolutions: [
      { downsampling_factor: 1, nominal_data_interval_seconds: 0.1 },
      { downsampling_factor: 5, nominal_data_interval_seconds: 0.5 },
      { downsampling_factor: 25, nominal_data_interval_seconds: 0.25 },
    ],
    available_versions: ["04"],
    datasets: [generateTestDataset()],
    description: "",
    full_id: generateUniqueName(),
    id: generateUniqueName(),
    instruments: ["C", "D"],
    mission: { id: "MISSION", label: "MISSION" },
    processing_level: "1A",
    query_result_limit: 1000,
    timestamp_field: generateUniqueName(),
  };
};

export const generateTestProducts = (count: number): Product[] => {
  const products: Product[] = [];
  for (let i = 0; i < count; i++) {
    products.push(generateTestProduct());
  }
  return products;
};
