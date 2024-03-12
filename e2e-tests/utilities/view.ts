import { generateUniqueName } from "../../e2e-tests/utilities/generic";
import { ChartLayer } from "../../src/types/view";
import { generateUUID } from "../../src/utilities/generic";

export const generateTestChartLayer = (): ChartLayer => {
  return {
    datasetId: generateUniqueName(),
    endTime: "",
    field: generateUniqueName(),
    id: generateUUID(),
    mission: "",
    startTime: "",
    streamId: generateUUID(),
    type: "line",
    yAxisId: generateUUID(),
  };
};
