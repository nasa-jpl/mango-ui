import { formatDateISO } from "@nasa-jpl/stellar-react";

/**
 * Parses input ISO string to return datetime-local string.
 * e.g. "2022-03-02T00:36:00.000Z" -> "2022-03-02T00:36"
 *
 * @param {string} isoStr ISO string
 * @return {string} datetime-local string
 */
export function toDatetimelocalStr(isoStr: string) {
  return isoStr.substring(0, 16);
}

/**
 * Converts datetime-local string to equivalent UTC time in milliseconds.
 * e.g. "2022-03-02T00:29" -> 1646180940000
 *
 * @param {string} datetimeStr datetime-local string
 * @return {number} UTC time in milliseconds
 */
export function toUTCms(value: string) {
  return Date.parse(value + "Z");
}

/**
 * Converts j2 (time since year 2000) to UTC ms
 */
export function j2ToMs(x: number) {
  return x * 1000 + 946728000000;
}

/**
 * Takes Date object and returns date string in GPS time format.
 * @param {Date} date
 * @returns {string} format YYYY-MM-DDTHH:MM:SS
 */
export function formatDateGPS(date: Date) {
  return formatDateISO(date).substring(0, 19);
}

/*
 * Extend Date prototype to add toGPSString method.
 *
 * Removes the "Z" from the end of the input GPS date so as to not confuse
 * with UTC time and truncates to YYYY-MM-DDTHH:MM:SS format.
 *
 * @param {Date} Date object in GPS time.
 * @return {string} String in GPS format YYYY-MM-DDTHH:MM:SS.
 */
Date.prototype.toGPSString = function (): string {
  return this.toISOString().substring(0, 19);
};
