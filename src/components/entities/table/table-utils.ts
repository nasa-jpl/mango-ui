import type { ProductField } from "../../../types/api";
import type {
  ComputedThresholds,
  ProcessedDataResponseDataEntry,
} from "../../../types/app";
import type { Status } from "../../../types/status";
import type { TableColumn } from "../../../types/view";

/** The per-field cell shape inside a `DataResponseDataEntry` (a partial aggregation record). */
export type TableFieldValue = Partial<
  Record<"value" | "min" | "max" | "avg" | "centroid", string | number>
>;

/** Map a product field type to the corresponding ag-grid floating-filter type. */
export function getAGGridFilterType(type: ProductField["type"] | string) {
  switch (type) {
    case "int":
    case "float":
      return "agNumberColumnFilter";
    case "str":
    case "bool":
    case "dict":
      return "agTextColumnFilter";
    case "datetime":
      return "agDateColumnFilter";
    default:
      return true;
  }
}

/**
 * Derive the value to display for a table cell from its raw field data:
 * a raw (non-object) value as-is, otherwise `value`, then `avg`, then a `min – max` range.
 */
export function getFieldDisplayValue(
  fieldData: TableFieldValue,
): string | number | undefined {
  if (typeof fieldData !== "object") {
    return fieldData;
  }
  if (Object.prototype.hasOwnProperty.call(fieldData, "value")) {
    return fieldData.value;
  }
  if (Object.prototype.hasOwnProperty.call(fieldData, "avg")) {
    return fieldData.avg;
  }
  if (
    Object.prototype.hasOwnProperty.call(fieldData, "min") &&
    Object.prototype.hasOwnProperty.call(fieldData, "max")
  ) {
    return `${fieldData.min} – ${fieldData.max}`;
  }
}

/**
 * Format a data column cell value: datetime values are truncated to the day (`short`) or to the
 * offset boundary; empty strings render as a dash; everything else passes through unchanged.
 */
export function formatTableCellValue(
  value: string,
  type: string | undefined,
  dateFormat: string | undefined,
): string {
  if (type === "datetime" && dateFormat === "short") {
    return value.split("T")[0];
  } else if (type === "datetime") {
    return value.split("+")[0];
  }

  if (value === "") {
    return "-";
  }

  return value;
}

/**
 * Format the derived timestamp column: collapsed-by-day truncates to the date, otherwise the
 * value is truncated at the timezone offset boundary.
 */
export function formatTimestampValue(
  value: string,
  collapseByDay: boolean,
): string {
  if (collapseByDay) {
    return value.split("T")[0];
  }
  return value.split("+")[0];
}

/**
 * Derive the overall threshold status for a table row: `"error"` if any column's computed
 * limit is tripped, otherwise `"warning"` if any warning is tripped, otherwise `"nominal"`.
 * Columns without threshold data (or with no tripped flags) are skipped.
 */
export function deriveRowTrippedStatus(
  rowData: Record<string, ProcessedDataResponseDataEntry> | null | undefined,
  columns: TableColumn[],
): Status {
  let tripped: Status = "nominal";
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];

    // For each column, see if the row has tripped any thresholds
    if (
      !rowData ||
      !(column.layerId in rowData) ||
      !(column.field in rowData[column.layerId]) ||
      !rowData[column.layerId][column.field] ||
      !rowData[column.layerId][column.field]._thresholds
    ) {
      continue;
    }
    const { limits, warnings }: ComputedThresholds =
      rowData[column.layerId][column.field]._thresholds!;

    if (limits.lower || limits.upper) {
      tripped = "error";
      break;
    }

    if (warnings.lower || warnings.upper) {
      tripped = "warning";
      break;
    }
  }
  return tripped;
}

/** Map a derived row threshold status to its ag-grid row CSS class (empty when nominal). */
export function getRowThresholdClass(status: Status): string {
  if (status === "error") {
    return "limit-row";
  }
  if (status === "warning") {
    return "warning-row";
  }
  return "";
}

/** Build the multi-line cell tooltip describing a field's computed limit/warning threshold values. */
export function buildThresholdTooltip(
  label: string | undefined,
  limits: ComputedThresholds["limits"],
  warnings: ComputedThresholds["warnings"],
): string {
  return (
    `Field: ${label} \n` +
    `Lower limit value: ${limits.lower_value ?? "-"} \n` +
    `Upper limit value: ${limits.upper_value ?? "-"} \n` +
    `Lower warning value: ${warnings.lower_value ?? "-"} \n` +
    `Upper warning value: ${warnings.upper_value ?? "-"}`
  );
}
