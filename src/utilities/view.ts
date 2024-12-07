import { format } from "d3-format";
import {
  ChartEntity,
  ChartLayer,
  ChartLayerEvent,
  ChartLayerLine,
  DataTransform,
  DataTransformDerived,
  DataTransformSelf,
  DownlinkDashboardEntity,
  Entity,
  EntityType,
  MapEntity,
  TableEntity,
  TextEntity,
  TimeSeriesPoint,
  TimelineRowEntity,
} from "../types/view";

export function isChartEntity(entity: Entity): entity is ChartEntity {
  return entity.type === "chart";
}

export function isMapEntity(entity: Entity): entity is MapEntity {
  return entity.type === "map";
}

export function isTableEntity(entity: Entity): entity is TableEntity {
  return entity.type === "table";
}

export function isDownlinkDashboardEntity(
  entity: Entity
): entity is DownlinkDashboardEntity {
  return entity.type === "downlink-dashboard";
}

export function isTimelineRowEntity(
  entity: Entity
): entity is TimelineRowEntity {
  return entity.type === "timeline-row";
}

export function isChartLayerLine(layer: ChartLayer): layer is ChartLayerLine {
  return layer.type === "line";
}

export function isChartLayerEvent(layer: ChartLayer): layer is ChartLayerEvent {
  return layer.type === "event";
}

export function isTextEntity(entity: {
  type: EntityType;
}): entity is TextEntity {
  return entity.type === "text";
}

export function applyLayerTransform(
  value: number,
  point: TimeSeriesPoint,
  transform: DataTransform,
  field: string | undefined,
  data: {
    layer: ChartLayer;
    pointsByField: Record<string, TimeSeriesPoint[]>;
  }[],
  index: number = 0
): number {
  let newValue = value;
  if (transform.type === "self") {
    // Transform using specified modifiers on the original data
    const transformSelf = transform as DataTransformSelf;
    newValue += transformSelf.add ?? 0;
    newValue -= transformSelf.subtract ?? 0;
    newValue *= transformSelf.multiply ?? 1;
    newValue /= transformSelf.divide ?? 1;
  } else if (transform.type === "derived") {
    const transformDerived = transform as DataTransformDerived;
    // Transform using the matching point from a specified layer
    const matchingLayer = data.find(
      ({ layer }) => layer.id === transformDerived.layerId
    );
    if (matchingLayer && field) {
      // Find matching value in time
      const matchingPoint = matchingLayer.pointsByField[field][index];
      if (
        typeof matchingPoint === "object" &&
        // TODO would be nice to refactor this to take in a Point<number, number> where x is milliseconds
        // instead of a timestamp string
        new Date(matchingPoint.x).getTime() === new Date(point.x).getTime()
      ) {
        newValue += transform.add ? (matchingPoint.y as number) : 0;
        newValue -= transform.subtract ? (matchingPoint.y as number) : 0;
        newValue *= transform.multiply ? (matchingPoint.y as number) : 1;
        newValue /= transform.divide ? (matchingPoint.y as number) : 1;
      }
    }
  }

  return newValue;
}

/* Apply layer transformations to a point at the given index */
export function applyLayerTransforms(
  point: TimeSeriesPoint,
  layer: ChartLayer,
  data: {
    layer: ChartLayer;
    pointsByField: Record<string, TimeSeriesPoint[]>;
  }[],
  index: number
) {
  if (!layer.transforms || !layer.transforms.length) return point;
  const field = layer.fields[0]; // TODO pass this in?
  let newPoint = { ...point };
  layer.transforms.forEach((transform) => {
    const value = newPoint[transform.axis];
    newPoint = {
      ...newPoint,
      x:
        transform.axis === "x"
          ? new Date(
              applyLayerTransform(
                new Date(value).getTime(),
                newPoint,
                transform,
                field,
                data,
                index
              )
            ).toISOString()
          : newPoint.x,
      y:
        transform.axis === "y"
          ? applyLayerTransform(
              value as number,
              newPoint,
              transform,
              field,
              data,
              index
            )
          : newPoint.y,
    };
  });
  return newPoint;
}

// TODO move to a more generic utils file?
export function formatYValue(tickValue: number | string): string {
  if (typeof tickValue === "string") {
    return tickValue;
  }
  return format("~g")(tickValue);
}
