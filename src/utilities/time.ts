/**
 * Parses input ISO string to return datetime-local string.
 * e.g. "2022-03-02T00:36:00.000Z" -> "2022-03-02T00:36"
 *
 * @param {string} isoStr ISO string
 * @return {string} datetime-local string
 */
export function toDatetimelocalStr(isoStr: string) {
  return isoStr.substring(0,16)
}

/**
 * Converts datetime-local string to equivalent UTC time in milliseconds.
 * e.g. "2022-03-02T00:29" -> 1646180940000
 *
 * @param {string} datetimeStr datetime-local string
 * @return {number} UTC time in milliseconds
 */
export function toUTCms(value: string ) {
  return Date.parse(value + 'Z')
}
