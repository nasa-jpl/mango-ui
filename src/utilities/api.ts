import { config } from "../config";
import { Metadata } from "../types/data";
import { DateRange } from "../types/time";
import { Dataset } from "../types/view";
import { fetchWithProgress } from "./generic";

export const getMissions = async (): Promise<string[]> => {
  const url = config.endpoints.data + config.api.data.missions;
  const response = await (await fetch(url)).json();
  return response.data;
};

export const getDatasets = async (mission: string): Promise<Dataset[]> => {
  const url =
    config.endpoints.data +
    config.api.data.datasets.replace("{MISSION}", mission);
  const response = await (await fetch(url)).json();
  return response.data;
};

export const getMetadata = async (entity: string): Promise<Metadata> => {
  const url =
    config.endpoints.data +
    config.api.data.metadata.replace("{MISSION}", entity);
  const response = await (await fetch(url)).json();
  console.log("response :>> ", response);
  return response;
};

export const getData = (
  mission: string,
  datasetId: string,
  streamId: string,
  dateRange: DateRange
) => {
  const { start, end } = dateRange;
  const url =
    config.endpoints.data +
    config.api.data.data
      .replace("{MISSION}", mission)
      .replace("{STREAM}", streamId)
      .replace("{DATASET}", datasetId) +
    `?from_isotimestamp=${start}&to_isotimestamp=${end}`;
  return fetchWithProgress(url);
};
