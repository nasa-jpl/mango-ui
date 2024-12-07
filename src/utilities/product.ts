import { DataResponseDataEntry, Product, ProductField } from "../types/api";
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
): {
  limits: { lower: boolean; upper: boolean };
  warnings: { lower: boolean; upper: boolean };
} {
  const result = {
    limits: { lower: false, upper: false },
    warnings: { lower: false, upper: false },
  };
  // Bail if field has no threshold configurations
  if (!field.value_threshold_configurations) {
    return result;
  }

  // Find matching threshold entry
  const matchingThresholdConfig = field.value_threshold_configurations.find(
    (threshold) => {
      let inRange = true;
      if (threshold.effective_from) {
        inRange = threshold.effective_from >= data.timestamp;
      }
      if (threshold.effective_to) {
        inRange = threshold.effective_to <= data.timestamp;
      }
      return inRange;
    }
  );

  if (!matchingThresholdConfig) {
    return result;
  }

  // Compute violations
  const value = data[field.name].value as number;
  result.limits = {
    lower: value < matchingThresholdConfig.limits.lower,
    upper: value > matchingThresholdConfig.limits.upper,
  };
  result.warnings = {
    lower: value < matchingThresholdConfig.warnings.lower,
    upper: value > matchingThresholdConfig.warnings.upper,
  };
  return result;
}
