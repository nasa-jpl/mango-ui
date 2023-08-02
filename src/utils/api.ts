import { config } from "../config";
import { Telemetry } from "../types/data";
import { DateRange } from "../types/time";
import fetchWithProgress from "./generic";

export const getAvailableDataFields = async (
  spacecraft: string
): Promise<string[]> => {
  const url =
    config.endpoints.data +
    config.api.data.metadata.replace("{SPACECRAFT}", spacecraft);
  const response = await (await fetch(url)).json();
  return response.data;
};

export const getData = (spacecraft: string, dateRange: DateRange) => {
  const { start, end } = dateRange;
  const url =
    config.endpoints.data +
    config.api.data.data.replace("{SPACECRAFT}", spacecraft) +
    `?from_isotimestamp=${start}&to_isotimestamp=${end}`;
  return fetchWithProgress(url);
};
