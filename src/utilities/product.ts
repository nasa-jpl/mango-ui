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
  const product = getProductForLayer(layer, products);
  if (product) {
    return product.available_fields.find((f) => f.name === layer.field);
  }
}
