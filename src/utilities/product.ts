import { DataResponseDataEntry, Product, ProductField } from "../types/api";
import { ComputedThresholds } from "../types/app";
import { DataLayer } from "../types/view";

export function getProductForLayer(
  layer: DataLayer,
  products: Product[]
): Product | undefined {
  return products.find(
    (d) => layer.mission === d.mission && layer.dataset === d.id
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
  const result = {
    limits: { lower: false, upper: false },
    warnings: { lower: false, upper: false },
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
  };
  return result;
}
