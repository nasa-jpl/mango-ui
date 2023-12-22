import { config } from "../config";
import { Metadata } from "../types/data";
import { DateRange } from "../types/time";
import { fetchWithProgress } from "./generic";

export const getMetadata = async (spacecraft: string): Promise<Metadata> => {
  const url =
    config.endpoints.data +
    config.api.data.metadata.replace("{SPACECRAFT}", spacecraft);
  const response = await (await fetch(url)).json();
  console.log("response :>> ", response);
  return response;
};

export const getData = (
  spacecraft: string,
  streamId: number,
  dateRange: DateRange,
  decimationLevel: number,
  numPoints: 5000
) => {
  const { start, end } = dateRange;
  const url =
    config.endpoints.data +
    config.api.data.data
      .replace("{SPACECRAFT}", spacecraft)
      .replace("{STREAM_ID}", streamId.toString()) +
    `?from_isotimestamp=${start}&to_isotimestamp=${end}&decimation_ratio=${decimationLevel}&downsample_to_count=${numPoints}`;
  console.log("url :>> ", url);
  return fetchWithProgress(url);
};
