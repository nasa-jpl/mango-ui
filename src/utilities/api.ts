import { config } from "../config";
import { DataResponse, DataResponseError, Product } from "../types/api";
import { View } from "../types/view";

export const getView = async (signal?: AbortSignal): Promise<View> => {
  const data = await fetch(import.meta.env.BASE_URL + "default-view.json", {
    signal,
  });
  const view = (await data.json()) as View;
  return view;
};

export const getMissions = async (signal: AbortSignal): Promise<string[]> => {
  const url = config.endpoints.data + config.api.data.missions;
  const response = await (await fetch(url, { signal })).json();
  return response.data;
};

export const getProducts = async (
  mission: string,
  signal: AbortSignal
): Promise<Product[]> => {
  const url =
    config.endpoints.data +
    config.api.data.products.replace("{MISSION}", mission);
  const response = await (await fetch(url, { signal })).json();
  return response.data;
};

export const getData = (
  mission: string,
  dataset: string,
  instrumentId: string,
  version: string,
  fields: string[],
  startTime: string,
  endTime: string,
  downsamplingFactor?: number
) => {
  const url =
    config.endpoints.data +
    config.api.data.data
      .replace("{MISSION}", mission)
      .replace("{INSTRUMENT}", instrumentId)
      .replace("{DATASET}", dataset)
      .replace("{VERSION}", version) +
    `?from_isotimestamp=${startTime}&to_isotimestamp=${endTime}&fields=timestamp${
      fields.length ? `${fields.map((f) => `&fields=${f}`).join("")}` : ""
    }${
      typeof downsamplingFactor === "number"
        ? `&downsampling_factor=${downsamplingFactor}`
        : ""
    }`;

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
