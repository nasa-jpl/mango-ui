import { generateUniqueName } from "../../e2e-tests/utilities/generic";
import { ChartLayer } from "../../src/types/view";
import { generateUUID } from "../../src/utilities/generic";

export const generateTestChartLayer = (): ChartLayer => {
  return {
    dataset: generateUniqueName(),
    endTime: "",
    field: generateUniqueName(),
    id: generateUUID(),
    mission: "",
    startTime: "",
    instrument: generateUUID(),
    type: "line",
    version: "04",
    yAxisId: generateUUID(),
  };
};
