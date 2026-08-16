import { DataResponseDataEntry, Dataset, Product, ProductField } from "../types/api";
import { ComputedThresholds } from "../types/app";
import { DataLayer } from "../types/view";

export function getProductForLayer(
  layer: DataLayer,
  products: Product[]
): Product | undefined {
  return products.find(
    (d) => layer.mission === d.mission.id && layer.dataset === d.id
  );
}

/**
 * Returns the matching Dataset entry for a layer, if the data has been ingested.
 * A match requires the product to exist and have a dataset with the same version and instrument.
 */
export function getDatasetForLayer(
  layer: DataLayer,
  products: Product[],
  instrument?: string | null,
): Dataset | undefined {
  const product = getProductForLayer(layer, products);
  if (!product) return undefined;
  const layerInstrument = instrument ?? layer.instrument;
  return product.datasets.find(
    (ds) => ds.version_id === layer.version && ds.instrument_id === layerInstrument,
  );
}

export function getFieldMetadataForLayer(
  field: string,
  layer: DataLayer,
  products: Product[]
): ProductField | undefined {
  const product = getProductForLayer(layer, products);
  if (product) {
    return product.available_fields.find((f) => f.name === field);
  }
}

/**
 * Per-row units
 * -------------
 * Most products define a field's unit statically on the field metadata (the
 * "case 1" shape, ~95% of products). A handful of products instead carry a
 * *single* measurement per row where the unit is a property of the row, not
 * the column — "case 2": IHK1A/B, LHK1A/B, OFFRED (and TDP1A/1B, whose unit is
 * genuinely indeterminable and left blank). For these, mango-ingest writes the
 * unit into a literal `unit` column (see mango-ingest PR #312, April 2026).
 *
 * Confirmed with the ingest team (2026): for case-2 products the measurement
 * field's `unit` metadata is null, and the real unit must be read from the
 * `unit` column of any returned row. It is guaranteed constant across any
 * single query a client is permitted to make, because these products always
 * require their channel_id column (e.g. `sensorname` for IHK/LHK) to be
 * provided, and a given channel yields exactly one unit. So we resolve the
 * unit once per query rather than per row.
 *
 * NOTE: identifying *which* field is "the measurement field" relies on the
 * heuristic below (a non-channel field whose static unit is null, in a product
 * that exposes a `unit` column). The backend does not currently expose this
 * distinction explicitly; revisit if that changes.
 */
export const PER_ROW_UNIT_FIELD = "unit";

/**
 * Field names that denote "the measurement value" for the known case-2
 * products: `sensorvalue` (IHK/LHK) and `value` / `value_float|int|str`
 * (OFFRED). Only these should resolve a per-row unit — sibling null-unit fields
 * like `sensortype`, `qualflg`, `gracefo_id`, `time_ref`, `obt_type` must not.
 *
 * INTERIM: the backend does not yet flag which field is the measurement field,
 * so we match by name. Extend this (or replace it with a real backend signal)
 * when a new case-2 product uses a different measurement field name.
 */
const MEASUREMENT_VALUE_FIELD = /^(sensorvalue|value(_[a-z0-9]+)?)$/i;

/** True when the product carries a per-row `unit` column. */
export function productHasPerRowUnitField(
  product: Product | undefined | null
): boolean {
  return !!product?.available_fields.some(
    (f) => f.name === PER_ROW_UNIT_FIELD
  );
}

/**
 * True when displaying `field` requires reading the per-row `unit` column:
 * the product exposes a `unit` column, and `field` is a measurement-value
 * field with no statically-defined unit. Sibling null-unit fields that are not
 * the measurement (channel_id, `unit` itself, quality flags, discriminators)
 * are excluded so we don't speculatively fetch `unit` / force factor=1 for them.
 */
export function fieldUsesPerRowUnit(
  field: ProductField | undefined | null,
  product: Product | undefined | null
): boolean {
  if (!field || !product) return false;
  if (!productHasPerRowUnitField(product)) return false;
  if (field.name === PER_ROW_UNIT_FIELD) return false;
  if (field.is_channel_id) return false;
  if (field.unit != null) return false;
  return MEASUREMENT_VALUE_FIELD.test(field.name);
}

/**
 * Reads the per-row unit value out of fetched data. Because the unit is
 * constant across a query, the first row that carries one wins. Returns "" if
 * no row carries a unit (e.g. empty result, or the column was not fetched).
 */
export function readPerRowUnit(
  data: DataResponseDataEntry[] | null | undefined
): string {
  if (!data) return "";
  for (const row of data) {
    const entry = row[PER_ROW_UNIT_FIELD];
    const value =
      entry && typeof entry === "object" ? entry.value : undefined;
    if (value != null && value !== "") return String(value);
  }
  return "";
}

/**
 * Resolves the unit to display for `field` given the fetched rows.
 * - A statically-defined unit passes through unchanged.
 * - A per-row-unit measurement field resolves to the row's `unit` column value.
 * - Otherwise returns "" (no unit, e.g. TDP or a unitless field).
 */
export function resolveFieldUnit(
  field: ProductField | undefined | null,
  product: Product | undefined | null,
  data: DataResponseDataEntry[] | null | undefined
): string {
  if (field?.unit) return field.unit;
  if (fieldUsesPerRowUnit(field, product)) return readPerRowUnit(data);
  return "";
}

// TODO only supports value, does not yet support min/max/etc
export function applyFieldThresholds(
  field: ProductField,
  data: DataResponseDataEntry
): ComputedThresholds {
  const result: ComputedThresholds = {
    limits: {
      lower: false,
      lower_value: null,
      upper: false,
      upper_value: null,
    },
    warnings: {
      lower: false,
      lower_value: null,
      upper: false,
      upper_value: null,
    },
  };

  // Bail if field has no threshold configurations
  if (!field.qc_thresholds) {
    return result;
  }

  // Find matching threshold entry
  const matchingThresholdConfig = field.qc_thresholds.find((threshold) => {
    if (!threshold.effective_since && !threshold.effective_until) {
      return true;
    }
    let inRange = false;
    if (threshold.effective_since) {
      inRange = threshold.effective_since <= data.timestamp;
    }
    if (threshold.effective_until) {
      inRange = threshold.effective_until >= data.timestamp;
    }
    return inRange;
  });

  if (!matchingThresholdConfig) {
    return result;
  }

  // Compute violations
  const value = data[field.name].value as number;
  result.limits = {
    lower: matchingThresholdConfig.limits
      ? value <
        (matchingThresholdConfig.limits.lower ?? Number.NEGATIVE_INFINITY)
      : false,
    upper: matchingThresholdConfig.limits
      ? value >
        (matchingThresholdConfig.limits.upper ?? Number.POSITIVE_INFINITY)
      : false,
    lower_value: matchingThresholdConfig.limits
      ? matchingThresholdConfig.limits.lower ?? null
      : null,
    upper_value: matchingThresholdConfig.limits
      ? matchingThresholdConfig.limits.upper ?? null
      : null,
  };

  result.warnings = {
    lower: matchingThresholdConfig.warnings
      ? value <
        (matchingThresholdConfig.warnings.lower ?? Number.NEGATIVE_INFINITY)
      : false,
    upper: matchingThresholdConfig.warnings
      ? value >
        (matchingThresholdConfig.warnings.upper ?? Number.POSITIVE_INFINITY)
      : false,
    lower_value: matchingThresholdConfig.warnings
      ? matchingThresholdConfig.warnings.lower ?? null
      : null,
    upper_value: matchingThresholdConfig.warnings
      ? matchingThresholdConfig.warnings.upper ?? null
      : null,
  };
  return result;
}
