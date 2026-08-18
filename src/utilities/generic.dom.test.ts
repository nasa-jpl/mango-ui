// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { downloadJSON, isMacOs } from "./generic";

afterEach(() => {
  vi.restoreAllMocks();
});

test("downloadJSON creates, clicks, and revokes an object-URL anchor", () => {
  // jsdom does not implement object URLs, so install assertable stubs.
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:mock-url");
  const revokeObjectURL = vi.fn<(url: string) => void>();
  URL.createObjectURL =
    createObjectURL as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL =
    revokeObjectURL as unknown as typeof URL.revokeObjectURL;

  const clickSpy = vi.fn();
  const anchor = document.createElement("a");
  anchor.click = clickSpy;
  const createElement = vi
    .spyOn(document, "createElement")
    .mockReturnValue(anchor);

  try {
    const obj = { hello: "world" };
    downloadJSON(obj, "report");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    // The blob passed to createObjectURL carries the serialized JSON, pretty-printed.
    const blobArg = createObjectURL.mock.calls[0][0];
    expect(blobArg.type).toBe("application/json");
    expect(blobArg.size).toBe(JSON.stringify(obj, null, 2).length);
    expect(createElement).toHaveBeenCalledWith("a");
    expect(anchor.download).toBe("report.json");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});

test("isMacOs reflects the navigator platform", () => {
  const original = Object.getOwnPropertyDescriptor(
    window.navigator,
    "platform",
  );

  Object.defineProperty(window.navigator, "platform", {
    value: "MacIntel",
    configurable: true,
  });
  expect(isMacOs()).toBe(true);

  Object.defineProperty(window.navigator, "platform", {
    value: "Win32",
    configurable: true,
  });
  expect(isMacOs()).toBe(false);

  if (original) {
    Object.defineProperty(window.navigator, "platform", original);
  }
});
