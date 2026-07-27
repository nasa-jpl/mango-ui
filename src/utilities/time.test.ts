import { expect, test } from "vitest";
import { formatDateGPS, j2ToMs, toDatetimelocalStr, toUTCms } from "./time";

test("toDatetimelocalStr truncates an ISO string to minute precision", () => {
  expect(toDatetimelocalStr("2022-03-02T00:36:00.000Z")).toBe(
    "2022-03-02T00:36",
  );
  expect(toDatetimelocalStr("1999-12-31T23:59:59.999Z")).toBe(
    "1999-12-31T23:59",
  );
});

test("toUTCms parses a datetime-local string as UTC", () => {
  // The appended 'Z' forces UTC interpretation regardless of the host timezone.
  expect(toUTCms("2022-03-02T00:29")).toBe(Date.UTC(2022, 2, 2, 0, 29, 0));
  // Documented example from the source comment.
  expect(toUTCms("2022-03-02T00:29")).toBe(1646180940000);
  // Epoch-adjacent value.
  expect(toUTCms("2000-01-01T00:00")).toBe(946684800000);
  // Round-trips back to the same wall-clock time expressed in UTC.
  expect(new Date(toUTCms("2022-03-02T00:29")).toISOString()).toBe(
    "2022-03-02T00:29:00.000Z",
  );
});

test("j2ToMs converts seconds-since-2000-epoch to UTC milliseconds", () => {
  expect(j2ToMs(0)).toBe(946728000000);
  expect(j2ToMs(1)).toBe(946728001000);
  expect(j2ToMs(2)).toBe(946728002000);
  // The j2 zero point is 2000-01-01T12:00:00Z (J2000-style noon epoch).
  expect(new Date(j2ToMs(0)).toISOString()).toBe("2000-01-01T12:00:00.000Z");
});

test("formatDateGPS returns YYYY-MM-DDTHH:MM:SS (seconds precision, no zone)", () => {
  const d = new Date("2022-03-02T00:36:45.123Z");
  expect(formatDateGPS(d)).toBe("2022-03-02T00:36:45");
  // A whole-second date must not gain or lose digits.
  expect(formatDateGPS(new Date("2030-11-05T09:08:07Z"))).toBe(
    "2030-11-05T09:08:07",
  );
});
