import { config } from "../config";
import { DataResponse, DataResponseError, Dataset } from "../types/api";

export const getMissions = async (signal: AbortSignal): Promise<string[]> => {
  const url = config.endpoints.data + config.api.data.missions;
  const response = await (await fetch(url, { signal })).json();
  return response.data;
};

export const getDatasets = async (
  mission: string,
  signal: AbortSignal
): Promise<Dataset[]> => {
  const url =
    config.endpoints.data +
    config.api.data.datasets.replace("{MISSION}", mission);
  const response = await (await fetch(url, { signal })).json();
  return response.data;
};

export const getData = (
  mission: string,
  datasetId: string,
  streamId: string,
  version: string,
  field: string,
  startTime: string,
  endTime: string,
  downsamplingFactor: number
) => {
  const url =
    config.endpoints.data +
    config.api.data.data
      .replace("{MISSION}", mission)
      .replace("{STREAM}", streamId)
      .replace("{DATASET}", datasetId)
      .replace("{VERSION}", version) +
    `?from_isotimestamp=${startTime}&to_isotimestamp=${endTime}&fields=timestamp&fields=${field}&downsampling_factor=${downsamplingFactor}`;

  const controller = new AbortController();
  const cancel = () => controller.abort();
  const json = () =>
    new Promise<DataResponse>((resolve, reject) => {
      fetch(url, { signal: controller.signal })
        .then((response) => {
          if (response.status >= 200 && response.status <= 400) {
            response
              .json()
              .then((json) => {
                if (response.status === 400) {
                  throw new Error(
                    (json as DataResponseError).detail || "Unknown error"
                  );
                } else {
                  resolve(json as DataResponse);
                }
              })
              .catch((error) => {
                reject(error);
              });
          } else {
            reject(new Error(response.statusText));
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  return { json, cancel };
  // return fetchWithProgress<DataResponse>(url);
};
