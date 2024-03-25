import { Dataset, DatasetField } from "../types/api";
import { DataLayer } from "../types/view";

export function getDatasetForLayer(
  layer: DataLayer,
  datasets: Dataset[]
): Dataset | undefined {
  return datasets.find(
    (d) =>
      layer.mission === d.mission &&
      layer.datasetId === d.id &&
      d.available_fields.find((f) => f.name === layer.field)
  );
}

export function getFieldMetadataForLayer(
  layer: DataLayer,
  datasets: Dataset[]
): DatasetField | undefined {
  const dataset = getDatasetForLayer(layer, datasets);
  if (dataset) {
    return dataset.available_fields.find((f) => f.name === layer.field);
  }
}
