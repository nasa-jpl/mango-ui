import { Dataset } from "../../src/types/view";
import { generateUUID } from "../../src/utilities/generic";
import { generateUniqueName } from "./generic";

export const generateTestDataset = (): Dataset => {
  return {
    id: generateUUID(),
    name: generateUniqueName(),
    mission: generateUniqueName(),
  };
};

export const generateTestDatasets = (count: number): Dataset[] => {
  const datasets: Dataset[] = [];
  for (let i = 0; i < count; i++) {
    datasets.push(generateTestDataset());
  }
  return datasets;
};
