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

const compareNatural = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true });

/**
 * Flattens products into one row per dataset, sorted by product name, then
 * mission, spacecraft (instrument), and version so rows sharing a name have a
 * stable, predictable order.
 */
export function getProductDatasetRows(products: Product[]): Product[] {
  return products
    .flatMap((product) =>
      product.datasets.map((dataset) => ({
        ...product,
        datasets: [dataset],
        instruments: [dataset.instrument_id],
      })),
    )
    .sort(
      (a, b) =>
        compareNatural(a.id, b.id) ||
        compareNatural(a.mission.label, b.mission.label) ||
        compareNatural(a.datasets[0].instrument_id, b.datasets[0].instrument_id) ||
        compareNatural(a.datasets[0].version_id, b.datasets[0].version_id),
    );
}
