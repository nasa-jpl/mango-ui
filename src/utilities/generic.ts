import { v4 as uuidv4 } from "uuid";
import { DataLayer } from "../types/view";

/**
 * Generates unique ID
 */
export function generateUUID() {
  return uuidv4();
}

export function fetchWithProgress<T>(url: string) {
  let loading = false;
  let chunks: Uint8Array[] = [];
  let results = null;
  let error = null;
  let controller: AbortController | null = null;
  const target = new EventTarget();

  const json = async (options: RequestInit = {}) => {
    _resetLocals();
    const signal = controller?.signal;
    loading = true;

    try {
      const response = await fetch(url, { signal, ...options });

      if (response.status >= 200 && response.status < 300) {
        results = (await _readBody(response)) || "";
        return { result: JSON.parse(results) as T };
      } else {
        throw new Error(response.statusText);
      }
    } catch (err) {
      error = err as Error;
      results = null;
      return { error };
    } finally {
      loading = false;
    }
  };

  const _readBody = async (response: Response) => {
    if (!response.body || !response.headers) {
      target.dispatchEvent(new CustomEvent("failure"));
      return;
    }
    const reader = response.body.getReader();
    const length = +(response.headers.get("content-length") || 0);
    let received = 0;

    // Loop through the response stream and extract data chunks
    while (loading) {
      const { done, value } = await reader.read();
      const payload = { detail: { received, length, loading } };
      // const onProgress =  new CustomEvent("fetch-progress", payload);
      // const onFinished = new CustomEvent("fetch-finished", payload);

      if (done) {
        // Finish loading
        loading = false;
        target.dispatchEvent(new CustomEvent("complete", payload));
      } else {
        // Push values to the chunk array
        chunks.push(value);
        received += value.length;
        target.dispatchEvent(new CustomEvent("progress", payload));
      }
    }

    // Concat the chinks into a single array
    const body = new Uint8Array(received);
    let position = 0;

    // Order the chunks by their respective position
    for (const chunk of chunks) {
      body.set(chunk, position);
      position += chunk.length;
    }

    // Decode the response and return it
    return new TextDecoder("utf-8").decode(body);
  };

  const _resetLocals = () => {
    loading = false;

    chunks = [];
    results = null;
    error = null;

    controller = new AbortController();
  };

  const cancel = () => {
    controller?.abort();
    _resetLocals();
  };

  return { target, json, cancel };
}

/**
 * Returns unique identifier for a layer which currently comprises of:
 * mission, datasetid, field, and stream ID
 */
export function getLayerId(layer: DataLayer): string {
  return `${layer.mission}_${layer.datasetId}_${layer.field}_${layer.streamId}`;
}

/**
 * Returns true if the error is an Abort Error
 */
export function isAbortError(error: Error | unknown) {
  return (error as Error).name === "AbortError";
}
