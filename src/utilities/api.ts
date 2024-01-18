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
  entity: string,
  streamId: number,
  dateRange: DateRange,
  decimationLevel: number,
  numPoints: 5000
) => {
  const { start, end } = dateRange;
  const url =
    config.endpoints.data +
    config.api.data.data
      .replace("{MISSION}", entity)
      .replace("{STREAM_ID}", streamId.toString()) +
    `?from_isotimestamp=${start}&to_isotimestamp=${end}&decimation_ratio=${decimationLevel}&downsample_to_count=${numPoints}`;
  console.log("url :>> ", url);
  return fetchWithProgress(url);
};
