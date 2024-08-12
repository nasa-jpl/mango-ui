import { format } from "d3-format";
import {
  ChartEntity,
  ChartLayer,
  DataTransform,
  DataTransformDerived,
  DataTransformSelf,
  Entity,
  EntityType,
  MapEntity,
  TableEntity,
  TextEntity,
  TimeSeriesPoint,
  TimelineEntity,
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

export function isTimelineEntity(entity: Entity): entity is TimelineEntity {
  return entity.type === "timeline";
}

export function isTimelineRowEntity(
  entity: Entity
): entity is TimelineRowEntity {
  return entity.type === "timeline-row";
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
  data: { layer: ChartLayer; points: TimeSeriesPoint[] }[],
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
    if (matchingLayer) {
      // Find matching value in time
      const matchingPoint = matchingLayer.points[index];
      if (
        typeof matchingPoint === "object" &&
        // TODO would be nice to refactor this to take in a Point<number, number> where x is milliseconds
        // instead of a timestamp string
        new Date(matchingPoint.x).getTime() === new Date(point.x).getTime()
      ) {
        newValue += transform.add ? matchingPoint.y : 0;
        newValue -= transform.subtract ? matchingPoint.y : 0;
        newValue *= transform.multiply ? matchingPoint.y : 1;
        newValue /= transform.divide ? matchingPoint.y : 1;
      }
    }
  }

  return newValue;
}

/* Apply layer transformations to a point at the given index */
export function applyLayerTransforms(
  point: TimeSeriesPoint,
  layer: ChartLayer,
  data: { layer: ChartLayer; points: TimeSeriesPoint[] }[],
  index: number
) {
  if (!layer.transforms || !layer.transforms.length) return point;
  let newPoint = { ...point };
  layer.transforms.forEach((transform) => {
    const value = newPoint[transform.axis];
    newPoint = {
      x:
        transform.axis === "x"
          ? new Date(
              applyLayerTransform(
                new Date(value).getTime(),
                newPoint,
                transform,
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
