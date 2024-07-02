import { Product, ProductField } from "../types/api";
import { DataLayer } from "../types/view";

export function getProductForLayer(
  layer: DataLayer,
  products: Product[]
): Product | undefined {
  return products.find(
    (d) =>
      layer.mission === d.mission &&
      layer.dataset === d.id &&
      d.available_fields.find((f) => f.name === layer.field)
  );
}

export function getFieldMetadataForLayer(
  layer: DataLayer,
  products: Product[]
): ProductField | undefined {
  const dataset = getProductForLayer(layer, products);
  if (dataset) {
    return dataset.available_fields.find((f) => f.name === layer.field);
  }
}
