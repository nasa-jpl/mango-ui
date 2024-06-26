import { Dataset, DatasetStream, Stream } from "../../src/types/api";
import { generateUniqueName } from "./generic";

export const generateTestStream = (): Stream => {
  return {
    data_begin: "2022-01-01T00:00:00.037430+00:00",
    data_end: "2023-01-01T00:00:00.037430+00:00",
    id: generateUniqueName(),
  };
};

export const generateTestDataset = (): Dataset => {
  return {
    available_fields: [
      { name: generateUniqueName(), supported_aggregations: ["value"] },
      { name: generateUniqueName(), supported_aggregations: ["min", "max"] },
    ],
    available_versions: ["04"],
    available_resolutions: [
      { downsampling_factor: 1, nominal_data_interval_seconds: 0.1 },
      { downsampling_factor: 5, nominal_data_interval_seconds: 0.5 },
      { downsampling_factor: 25, nominal_data_interval_seconds: 0.25 },
    ],
    full_id: generateUniqueName(),
    id: generateUniqueName(),
    mission: generateUniqueName(),
    streams: [generateTestStream(), generateTestStream()],
    // data_begin: "2022-01-01T00:00:00.037430+00:00",
    // data_end: "2023-01-01T00:00:00.037430+00:00",
    timestamp_field: generateUniqueName(),
    query_result_limit: 1000,
  };
};

export const generateTestDatasetStream = (): DatasetStream => {
  const dataset = generateTestDataset();
  // @ts-expect-error transforming to DatasetStream
  delete dataset.streams;
  const datasetStream: DatasetStream = {
    ...dataset,
    instrument: generateUniqueName(),
  };
  return datasetStream;
};

export const generateTestDatasets = (count: number): Dataset[] => {
  const datasets: Dataset[] = [];
  for (let i = 0; i < count; i++) {
    datasets.push(generateTestDataset());
  }
  return datasets;
};
