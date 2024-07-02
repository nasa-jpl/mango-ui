import { Dataset, Product } from "../../src/types/api";
import { generateUniqueName } from "./generic";

export const generateTestDataset = (): Dataset => {
  return {
    data_begin: "2022-01-01T00:00:00.037430+00:00",
    data_end: "2023-01-01T00:00:00.037430+00:00",
    instrument: "C",
    last_updated: "2024-01-01T00:00:00.037430+00:00",
    product: generateUniqueName(),
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
      },
      {
        name: generateUniqueName(),
        supported_aggregations: [
          { field_name: "name_min", type: "min" },
          { field_name: "name_max", type: "max" },
        ],
        unit: "m/s",
        type: "float",
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
    mission: generateUniqueName(),
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
