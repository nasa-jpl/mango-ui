import { DataResponse } from "../../types/api";
import { DateRange } from "../../types/time";
import {
  ChartEntity,
  DataLayer,
  Entity as EntityType,
  TableEntity,
} from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import type { SelectedProduct } from "./EntityEditor";

/**
 * Build the canonical human-readable label for a selected product or data layer. The label
 * concatenates mission, instrument, dataset, fields, channels, version and (optionally) filter,
 * and is used both for display and as an equality key when matching layers to selected products.
 */
export const getLabelForSelectedProductOrLayer = (
  thing: SelectedProduct | DataLayer,
  fields?: string[],
) => {
  return `${thing.mission} ${thing.instrument} ${thing.dataset} ${(
    fields || thing.fields
  ).join(", ")} ${(thing.channels || [])
    .map((c) => `(${c.id}: ${c.value})`)
    .join(" ")} (v${thing.version}) ${
    Array.isArray(thing.filter) && thing.filter.length > 0
      ? `filter: ${thing.filter.join(", ")}`
      : ""
  }`;
};

// Returns the layer containing the selected product
export const getMatchingSelectedProductForLayer = (
  layer: DataLayer,
  selectedProducts: SelectedProduct[],
  fields?: string[],
): SelectedProduct | undefined => {
  return selectedProducts.find(
    (p) =>
      getLabelForSelectedProductOrLayer(p, fields || p.fields) ===
      getLabelForSelectedProductOrLayer(layer, fields || layer.fields),
  );
};

/**
 * A selected product is "complete" (ready to be emitted via onChange) once it has a mission,
 * instrument, dataset, at least one field, and a version.
 */
export const isSelectedProductComplete = (
  product: SelectedProduct,
): boolean => {
  return Boolean(
    product.mission &&
    product.instrument &&
    product.dataset &&
    product.fields.length &&
    product.version,
  );
};

/**
 * Whether a subset_version count fetch should run: the product must expose a subset_version
 * field and have a complete mission/instrument/dataset/version selection, with a date range set.
 */
export const shouldFetchSubsetVersionCount = (
  product: SelectedProduct,
  hasSubsetVersionField: boolean | undefined,
  dateRange: DateRange | undefined,
): boolean => {
  return Boolean(
    hasSubsetVersionField &&
    product.mission &&
    product.instrument &&
    product.dataset &&
    product.version &&
    dateRange,
  );
};

/**
 * Count the distinct `subset_version` values in a fetched data response, coercing each value
 * to a string and ignoring `null`/`undefined`. Returns 0 for a missing/malformed response.
 */
export const countSubsetVersionsInDataResponse = (
  data: DataResponse | null | undefined,
): number => {
  const subsetVersionSet = new Set<string>();
  if (data && Array.isArray(data.data)) {
    data.data.forEach((point) => {
      const subsetVersionValue = point.subset_version?.value;
      if (subsetVersionValue !== undefined && subsetVersionValue !== null) {
        subsetVersionSet.add(String(subsetVersionValue));
      }
    });
  }
  return subsetVersionSet.size;
};

export const extractEntitySelectedProducts = (
  entity: EntityType,
): SelectedProduct[] => {
  const layers = (entity as ChartEntity | TableEntity).layers || [];
  return layers.map((layer) => {
    return {
      id: generateUUID(),
      channels: layer.channels,
      fields: layer.fields,
      dataset: layer.dataset,
      mission: layer.mission,
      version: layer.version,
      instrument: layer.instrument,
      ...(Array.isArray(layer.filter) ? { filter: layer.filter } : null),
    } as SelectedProduct;
  });
};
