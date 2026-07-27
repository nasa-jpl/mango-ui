import { toast } from "sonner";
import { afterEach, expect, test, vi } from "vitest";
import { config } from "../config";
import { Channel } from "../types/view";
import {
  getData,
  getMissions,
  getProducts,
  getView,
  HttpError,
  saveView,
} from "./api";

// vi.mock is hoisted above imports, so the `toast` import above resolves to this mock.
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const DATA = config.endpoints.data;

/** A minimal fetch Response stub whose `json()` resolves `body`. */
function response(
  status: number,
  body: unknown,
  opts: { jsonRejects?: boolean; ok?: boolean } = {},
) {
  return {
    status,
    ok: opts.ok ?? (status >= 200 && status < 300),
    statusText: `HTTP ${status}`,
    json: opts.jsonRejects
      ? vi.fn().mockRejectedValue(new SyntaxError("bad json"))
      : vi.fn().mockResolvedValue(body),
  };
}

function stubFetch(...responses: unknown[]) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("getView requests the default view with JSON headers and credentials", async () => {
  const fetchMock = stubFetch(response(200, { data: { home: "H" } }));
  const signal = new AbortController().signal;

  const result = await getView(signal);

  expect(result).toEqual({ home: "H" });
  expect(fetchMock).toHaveBeenCalledWith(DATA + "/ui/fetch/default-view", {
    credentials: "include",
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });
  expect(toast.error).not.toHaveBeenCalled();
});

test("getView throws and toasts on a failed (>400) status", async () => {
  stubFetch(response(401, {}));
  await expect(getView()).rejects.toThrow("HTTP 401");
  expect(toast.error).toHaveBeenCalledWith("Unable to load view", {
    richColors: true,
  });
});

test("getView throws on a sub-200 status (lower bound)", async () => {
  stubFetch(response(100, {}));
  await expect(getView()).rejects.toThrow("HTTP 100");
});

// D1 characterization (see IMPACT.md): the success window is 200–400 INCLUSIVE, so 3xx
// redirects and a bare 400 are currently treated as success (no toast, data returned).
// This pins current behavior; it is flagged for maintainers, not endorsed.
test("getView currently treats 3xx and 400 as success (D1)", async () => {
  stubFetch(response(302, { data: "redirect-body" }));
  await expect(getView()).resolves.toBe("redirect-body");

  stubFetch(response(400, { data: "four-hundred-body" }));
  await expect(getView()).resolves.toBe("four-hundred-body");

  expect(toast.error).not.toHaveBeenCalled();
});

test("getMissions returns data and targets the missions endpoint", async () => {
  const fetchMock = stubFetch(
    response(200, { data: [{ id: "m1", label: "M1" }] }),
  );
  const signal = new AbortController().signal;

  const result = await getMissions(signal);

  expect(result).toEqual([{ id: "m1", label: "M1" }]);
  expect(fetchMock).toHaveBeenCalledWith(DATA + "/missions/", {
    signal,
    credentials: "include",
  });
});

test("getProducts interpolates the mission id into the URL", async () => {
  const fetchMock = stubFetch(response(200, { data: [{ id: "p1" }] }));
  const signal = new AbortController().signal;

  const result = await getProducts("GRACE", signal);

  expect(result).toEqual([{ id: "p1" }]);
  expect(fetchMock).toHaveBeenCalledWith(DATA + "/missions/GRACE/products", {
    signal,
    credentials: "include",
  });
});

test("HttpError carries a name and status", () => {
  const err = new HttpError("boom", 503);
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe("HttpError");
  expect(err.status).toBe(503);
  expect(err.message).toBe("boom");
});

test("getData builds a fully-parameterized URL and defers fetch until json()", async () => {
  const fetchMock = stubFetch(response(200, { data: [] }));
  const channels: Channel[] = [
    { id: "c1", value: "v1" },
    { id: "c2", value: "v2" },
  ];

  const { json } = getData(
    "M",
    "DS",
    "INSTR",
    "V",
    ["f1", "f2"],
    channels,
    "2020-01-01",
    "2020-02-01",
    5,
    ["x=1", "y=2"],
  );

  // Lazy: no request until json() is called.
  expect(fetchMock).not.toHaveBeenCalled();

  await json();

  const expectedUrl =
    DATA +
    "/missions/M/products/DS/versions/V/instruments/INSTR/data" +
    "?from_isotimestamp=2020-01-01&to_isotimestamp=2020-02-01&fields=timestamp" +
    "&fields=f1&fields=f2" +
    "&filter=c1=v1&filter=c2=v2" +
    "&filter=x=1&filter=y=2" +
    "&downsampling_factor=5";
  expect(fetchMock).toHaveBeenCalledWith(
    expectedUrl,
    expect.objectContaining({ credentials: "include" }),
  );
});

test("getData omits optional query segments when not provided", async () => {
  const fetchMock = stubFetch(response(200, { data: [] }));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await json();

  const expectedUrl =
    DATA +
    "/missions/M/products/DS/versions/V/instruments/INSTR/data" +
    "?from_isotimestamp=s&to_isotimestamp=e&fields=timestamp";
  expect(fetchMock).toHaveBeenCalledWith(
    expectedUrl,
    expect.objectContaining({ credentials: "include" }),
  );
});

test("getData.json() resolves the parsed body on a successful response", async () => {
  stubFetch(response(200, { data: [{ timestamp: "t" }] }));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).resolves.toEqual({ data: [{ timestamp: "t" }] });
});

test("getData.json() rejects with an HttpError (using detail) on a non-ok response", async () => {
  stubFetch(response(500, { detail: "server exploded" }));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).rejects.toMatchObject({
    name: "HttpError",
    status: 500,
    message: "server exploded",
  });
});

test("getData.json() falls back to statusText when the error body has no detail", async () => {
  stubFetch(response(503, {}));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).rejects.toMatchObject({
    name: "HttpError",
    status: 503,
    message: "HTTP 503",
  });
});

test("getData.json() falls back to statusText when the error body is not JSON", async () => {
  stubFetch(response(502, null, { ok: false, jsonRejects: true }));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).rejects.toMatchObject({
    name: "HttpError",
    status: 502,
    message: "HTTP 502",
  });
});

test("getData.json() surfaces a rejected fetch", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).rejects.toThrow("network down");
});

// The ok-branch also re-checks `response.status >= 400` and throws using the body `detail`
// (or a default). This is only reachable with an inconsistent ok=true/status>=400 response,
// but it is real code, so it is exercised here.
test("getData.json() throws with the body detail when an ok response reports status >= 400", async () => {
  stubFetch(response(400, { detail: "still bad" }, { ok: true }));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).rejects.toThrow("still bad");
});

test("getData.json() throws 'Unknown error' when such a response omits a detail", async () => {
  stubFetch(response(400, {}, { ok: true }));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).rejects.toThrow("Unknown error");
});

test("getData.json() rejects when parsing the body of an ok response fails", async () => {
  stubFetch(response(200, null, { ok: true, jsonRejects: true }));
  const { json } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  await expect(json()).rejects.toThrow("bad json");
});

test("getData.cancel() aborts the request controller", () => {
  stubFetch(response(200, { data: [] }));
  const abortSpy = vi.spyOn(AbortController.prototype, "abort");
  const { cancel } = getData("M", "DS", "INSTR", "V", [], [], "s", "e");
  cancel();
  expect(abortSpy).toHaveBeenCalledTimes(1);
});

test("saveView POSTs the wrapped view and toasts on success", async () => {
  const fetchMock = stubFetch(response(200, {}));
  const view = { home: {}, pageGroups: [], version: 1 };

  const ok = await saveView(view as never);

  expect(ok).toBe(true);
  expect(fetchMock).toHaveBeenCalledWith(DATA + "/ui/store/default-view", {
    credentials: "include",
    method: "POST",
    body: JSON.stringify({ data: view }),
    headers: { "Content-Type": "application/json" },
  });
  expect(toast.success).toHaveBeenCalledWith("View saved");
});

test("saveView throws on a failed status and does not toast success", async () => {
  stubFetch(response(500, {}));
  await expect(saveView({} as never)).rejects.toThrow("HTTP 500");
  expect(toast.success).not.toHaveBeenCalled();
});

test("saveView succeeds at the 400 upper boundary but throws below 200", async () => {
  stubFetch(response(400, {}));
  await expect(saveView({} as never)).resolves.toBe(true);
  expect(toast.success).toHaveBeenCalledTimes(1);

  stubFetch(response(100, {}));
  await expect(saveView({} as never)).rejects.toThrow("HTTP 100");
});
