import { afterEach, expect, test, vi } from "vitest";
import { ChartLayer } from "../types/view";
import {
  convertHexToRGBA,
  fetchWithProgress,
  generateUUID,
  getDataLayerId,
  isAbortError,
  pluralize,
} from "./generic";

test("pluralize", () => {
  expect(pluralize(0)).toBe("s");
  expect(pluralize(1)).toBe("");
  expect(pluralize(10)).toBe("s");
});

test("getDataLayerId", () => {
  const layer: ChartLayer = {
    mission: "MISSION",
    dataset: "DATASET",
    fields: ["FIELD1", "FIELD2"],
    instrument: "INSTRUMENT",
    endTime: "",
    startTime: "",
    type: "line",
    version: "VERSION",
    id: "ID",
  };
  expect(getDataLayerId(layer)).toEqual(
    "MISSION_DATASET_FIELD1_FIELD2_INSTRUMENT_VERSION_ID",
  );
});

test("isAbortError", () => {
  const error = new Error();
  expect(isAbortError(error)).toBe(false);

  const abortError = new Error();
  abortError.name = "AbortError";
  expect(isAbortError(abortError)).toBe(true);
});

test("generateUUID", () => {
  expect(generateUUID()).to.not.eq(generateUUID());
});

test("getDataLayerId includes channel id/value pairs when present", () => {
  const layer: ChartLayer = {
    mission: "M",
    dataset: "D",
    fields: ["f1"],
    instrument: "I",
    channels: [
      { id: "c1", value: "v1" },
      { id: "c2", value: "v2" },
    ],
    endTime: "",
    startTime: "",
    type: "line",
    version: "V",
    id: "ID",
  };
  expect(getDataLayerId(layer)).toEqual("M_D_f1_I_c1_v1_c2_v2V_ID");
});

test("convertHexToRGBA converts 6-digit and 3-digit hex", () => {
  expect(convertHexToRGBA("#ff0000")).toBe("rgba(255,0,0,1)");
  // Leading '#' is optional.
  expect(convertHexToRGBA("00ff00")).toBe("rgba(0,255,0,1)");
  // 3-digit shorthand expands each nibble.
  expect(convertHexToRGBA("#00f")).toBe("rgba(0,0,255,1)");
});

test("convertHexToRGBA applies opacity, converting whole-number percentages", () => {
  // Fractional opacity is used directly.
  expect(convertHexToRGBA("#000000", 0.5)).toBe("rgba(0,0,0,0.5)");
  // Whole-number opacity in (1, 100] is treated as a percentage.
  expect(convertHexToRGBA("#000000", 50)).toBe("rgba(0,0,0,0.5)");
  expect(convertHexToRGBA("#000000", 100)).toBe("rgba(0,0,0,1)");
  // Exactly 1 is a fraction, not a percentage (boundary).
  expect(convertHexToRGBA("#000000", 1)).toBe("rgba(0,0,0,1)");
  // Above 100 is out of the percentage window, so it is used as-is (upper boundary).
  expect(convertHexToRGBA("#000000", 150)).toBe("rgba(0,0,0,150)");
});

test("convertHexToRGBA falls back to black on invalid input", () => {
  expect(convertHexToRGBA(undefined as unknown as string)).toBe("#000000");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const encoder = new TextEncoder();

function mockStreamResponse(
  status: number,
  chunks: string[],
  opts: { noBody?: boolean; noHeaders?: boolean } = {},
) {
  const encoded = chunks.map((c) => encoder.encode(c));
  let i = 0;
  const reader = {
    read: async () =>
      i < encoded.length
        ? { done: false, value: encoded[i++] }
        : { done: true, value: undefined },
  };
  const body = chunks.join("");
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: `status ${status}`,
    headers: opts.noHeaders
      ? null
      : {
          get: (k: string) =>
            k === "content-length" ? String(body.length) : null,
        },
    body: opts.noBody ? null : { getReader: () => reader },
    json: async () => JSON.parse(body),
  };
}

test("fetchWithProgress streams a body, emits progress/complete, and parses JSON", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(mockStreamResponse(200, ['{"value"', ":42}"]));
  vi.stubGlobal("fetch", fetchMock);

  const { json, target } = fetchWithProgress<{ value: number }>(
    "http://x/data",
  );
  const progress = vi.fn();
  const complete = vi.fn();
  target.addEventListener("progress", progress);
  target.addEventListener("complete", complete);

  const result = await json();

  expect(fetchMock).toHaveBeenCalledWith(
    "http://x/data",
    expect.objectContaining({ signal: expect.anything() }),
  );
  expect(result).toEqual({ result: { value: 42 } });
  expect(progress).toHaveBeenCalledTimes(2); // one per streamed chunk
  expect(complete).toHaveBeenCalledTimes(1);

  // The progress payload must carry the parsed content-length and bytes received.
  const lastProgress = progress.mock.calls.at(-1)?.[0] as CustomEvent;
  expect(lastProgress.detail.length).toBe(12); // '{"value":42}' is 12 bytes
  expect(lastProgress.detail.received).toBe(8); // first chunk '{"value"' is 8 bytes
});

test("fetchWithProgress rejects sub-200 and 3xx statuses (boundary)", async () => {
  // status 100 (< 200) and 300 (not < 300) must both be treated as errors.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(mockStreamResponse(100, ['{"a":1}'])),
  );
  expect((await fetchWithProgress("http://x").json()).error).toBeInstanceOf(
    Error,
  );

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(mockStreamResponse(300, ['{"a":1}'])),
  );
  expect((await fetchWithProgress("http://x").json()).error).toBeInstanceOf(
    Error,
  );
});

test("fetchWithProgress returns an error for non-2xx responses", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(mockStreamResponse(500, ["{}"])),
  );
  const { json } = fetchWithProgress("http://x/data");
  const result = await json();
  expect(result.error).toBeInstanceOf(Error);
  expect(result.error?.message).toBe("status 500");
  expect(result.result).toBeUndefined();
});

test("fetchWithProgress dispatches failure and errors when the response has no body", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(mockStreamResponse(200, [], { noBody: true })),
  );
  const { json, target } = fetchWithProgress("http://x/data");
  const failure = vi.fn();
  target.addEventListener("failure", failure);

  const result = await json();

  expect(failure).toHaveBeenCalledTimes(1);
  // _readBody returns undefined → "" → JSON.parse("") throws → surfaced as error.
  expect(result.error).toBeInstanceOf(Error);
});

test("fetchWithProgress surfaces a rejected fetch as an error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
  const { json } = fetchWithProgress("http://x/data");
  const result = await json();
  expect(result.error?.message).toBe("network down");
});

test("fetchWithProgress cancel() aborts without throwing", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(mockStreamResponse(200, ["{}"])),
  );
  const { cancel } = fetchWithProgress("http://x/data");
  expect(() => cancel()).not.toThrow();
});
