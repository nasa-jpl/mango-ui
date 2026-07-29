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
