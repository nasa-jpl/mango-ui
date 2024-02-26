import { ChartEntity, Entity, MapEntity, TableEntity } from "../types/view";

export function isChartEntity(entity: Entity): entity is ChartEntity {
  return entity.type === "chart";
}

export function isMapEntity(entity: Entity): entity is MapEntity {
  return entity.type === "map";
}

export function isTableEntity(entity: Entity): entity is TableEntity {
  return entity.type === "table";
}
