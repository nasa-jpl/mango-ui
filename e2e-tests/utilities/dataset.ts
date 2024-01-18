import { DatasetStream, Stream } from "../../src/types/view";
import { generateUniqueName } from "./generic";

export const generateTestStream = (): Stream => {
  return {
    data_begin: "2022-01-01T00:00:00.037430+00:00",
    data_end: "2023-01-01T00:00:00.037430+00:00",
    id: generateUniqueName(),
  };
};

export const generateTestDatasetStream = (): DatasetStream => {
  return {
    available_fields: [generateUniqueName(), generateUniqueName()],
    full_id: generateUniqueName(),
    id: generateUniqueName(),
    mission: generateUniqueName(),
    data_begin: "2022-01-01T00:00:00.037430+00:00",
    data_end: "2023-01-01T00:00:00.037430+00:00",
    streamId: generateUniqueName(),
    timestamp_field: generateUniqueName(),
  };
};

export const generateTestDatasetStreams = (count: number): DatasetStream[] => {
  const datasets: DatasetStream[] = [];
  for (let i = 0; i < count; i++) {
    datasets.push(generateTestDatasetStream());
  }
  return datasets;
};
