import { parseDateStringISO } from "@nasa-jpl/stellar-react";
import { isAfter, isBefore, isValid } from "date-fns";
import { DateFormat } from "../../types/view";

export type DateRangeValidationResult =
  | { error: string; valid: false }
  | { endDate: Date; startDate: Date; valid: true };

export type DateRangeValidationInput = {
  dateFormat: DateFormat;
  dateString: string;
  maxDate: Date;
  minDate: Date;
  otherDateString: string;
  which: "from" | "to";
};

/** Parse a GPS/ISO date string, treating a missing `Z` suffix as UTC (rather than local time). */
function parseAsUtc(dateString: string): Date {
  return dateString.endsWith("Z")
    ? parseDateStringISO(dateString)
    : parseDateStringISO(dateString + "Z");
}

/**
 * Validate an edited date-range input against its counterpart and the allowed bounds, returning
 * either an error message or the resolved start/end dates. Pure counterpart of the
 * `DateRangePicker` blur/enter handler (no React state or callbacks).
 */
export function validateDateRangeInput({
  dateString,
  otherDateString,
  which,
  dateFormat,
  minDate,
  maxDate,
}: DateRangeValidationInput): DateRangeValidationResult {
  let eventDateString = dateString;
  let otherEventDateString = otherDateString;
  if (dateFormat === "short") {
    eventDateString += "T00:00:00";
    otherEventDateString += "T00:00:00";
  }

  // Treat GPS time string as UTC otherwise 7 hours will be added
  const eventDate = parseAsUtc(eventDateString);
  const eventVerb = which === "from" ? "start" : "end";
  const otherDate = parseAsUtc(otherEventDateString);
  const otherDateVerb = which === "from" ? "end" : "start";

  if (!dateString) {
    return {
      valid: false,
      error: `${eventVerb === "start" ? "Start" : "End"} date required`,
    };
  } else if (!eventDate || !isValid(eventDate)) {
    return { valid: false, error: `Invalid ${eventVerb} date` };
  } else if (isBefore(eventDate, minDate) || isAfter(eventDate, maxDate)) {
    return { valid: false, error: "Date out of range" };
  } else if (!otherDate || !isValid(otherDate)) {
    return { valid: false, error: `Invalid ${otherDateVerb} date` };
  }

  const startDate = which === "from" ? eventDate : otherDate;
  const endDate = which === "to" ? eventDate : otherDate;
  if (isBefore(endDate, startDate)) {
    return { valid: false, error: "Start date must precede end date" };
  }

  return { valid: true, startDate, endDate };
}
