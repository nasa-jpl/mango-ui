import {
  ChartEntity,
  ChartLayer,
  DataTransform,
  Entity,
  MapEntity,
  TableEntity,
} from "../types/view";

export function isChartEntity(entity: Entity): entity is ChartEntity {
  return entity.type === "chart";
}

export function isMapEntity(entity: Entity): entity is MapEntity {
  return entity.type === "map";
}

export function isTableEntity(entity: Entity): entity is TableEntity<never> {
  return entity.type === "table";
}

export function applyIndividualTransform(
  x: number,
  transform: DataTransform
): number {
  let newN = x;
  newN += transform.add ?? 0;
  newN -= transform.subtract ?? 0;
  newN *= transform.multiply ?? 1;
  newN /= transform.divide ?? 1;
  return newN;
}

export function applyLayerTransform(
  point: { x: number; y: number },
  layer: ChartLayer
) {
  if (!layer.transforms) return point;
  const { x, y } = point;
  return {
    x: layer.transforms.x ? applyIndividualTransform(x, layer.transforms.x) : x,
    y: layer.transforms.y ? applyIndividualTransform(y, layer.transforms.y) : y,
  };
}
