import { toast } from "sonner";
import { config } from "../config";
import { DataResponse, DataResponseError, Product } from "../types/api";
import { Channel, View } from "../types/view";

export const getView = async (signal?: AbortSignal): Promise<View> => {
  const url =
    config.endpoints.data +
    config.api.data.jsonStore
      .replace("{METHOD}", "fetch")
      .replace("{KEY}", "default-view");

  const response = await fetch(url, {
    credentials: "include",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
  });

  const json = await response.json();

  if (response.status >= 200 && response.status <= 400) {
    return json.data as View;
  } else {
    toast.error("Unable to load view", { richColors: true });
    throw new Error(response.statusText);
  }
};

export const getMissions = async (
  signal: AbortSignal
): Promise<
  {
    id: string;
    label: string;
  }[]
> => {
  const url = config.endpoints.data + config.api.data.missions;
  const response = await (
    await fetch(url, { signal, credentials: "include" })
  ).json();
  return response.data;
};

export const getProducts = async (
  missionId: string,
  signal: AbortSignal
): Promise<Product[]> => {
  const url =
    config.endpoints.data +
    config.api.data.products.replace("{MISSION}", missionId);
  const response = await (
    await fetch(url, { signal, credentials: "include" })
  ).json();
  return response.data;
};

export const getData = (
  missionId: string,
  dataset: string,
  instrumentId: string,
  version: string,
  fields: string[],
  channels: Channel[],
  startTime: string,
  endTime: string,
  downsamplingFactor?: number
) => {
  const fieldsString = fields.length
    ? `${fields.map((f) => `&fields=${f}`).join("")}`
    : "";
  const filtersString = channels.length
    ? channels
        .map((channel) => `&filter=${channel.id}=${channel.value}`)
        .join("")
    : "";
  const url =
    config.endpoints.data +
    config.api.data.data
      .replace("{MISSION}", missionId)
      .replace("{INSTRUMENT}", instrumentId)
      .replace("{DATASET}", dataset)
      .replace("{VERSION}", version) +
    `?from_isotimestamp=${startTime}&to_isotimestamp=${endTime}&fields=timestamp${fieldsString}${filtersString}${
      typeof downsamplingFactor === "number"
        ? `&downsampling_factor=${downsamplingFactor}`
        : ""
    }`;

  const controller = new AbortController();
  const cancel = () => controller.abort();
  const json = () =>
    new Promise<DataResponse>((resolve, reject) => {
      fetch(url, { signal: controller.signal, credentials: "include" })
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

export async function saveView(view: View) {
  const url =
    config.endpoints.data +
    config.api.data.jsonStore
      .replace("{METHOD}", "store")
      .replace("{KEY}", "default-view");

  const response = await fetch(url, {
    credentials: "include",
    method: "POST",
    body: JSON.stringify({ data: view }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status >= 200 && response.status <= 400) {
    toast.success("View saved");
    return true;
  } else {
    throw new Error(response.statusText);
  }
}
