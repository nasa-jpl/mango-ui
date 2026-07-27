import { DataResponseDataEntry } from "../../types/api";
import { ChartLayer } from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import { generateUniqueName } from "./generic";

export const generateTestChartLayer = (): ChartLayer => {
  return {
    dataset: generateUniqueName(),
    endTime: "",
    fields: [generateUniqueName()],
    id: generateUUID(),
    mission: "",
    startTime: "",
    instrument: generateUUID(),
    type: "line",
    version: "04",
    yAxisId: generateUUID(),
  };
};

export const generateTestDataEntry = (
  fields?: DataResponseDataEntry | undefined
): DataResponseDataEntry => {
  // @ts-expect-error TODO sort out the type for DataResponseDataEntry – TS does not like combo of optional type and known type with different signatures
  return {
    ...fields,
    timestamp: "2030-01-01T00:00:00.000Z",
  };
};
