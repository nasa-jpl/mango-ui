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
  Page,
  PageGroup,
  Section,
  SectionLayout,
  TableEntity,
  TextEntity,
  TimeSeriesPoint,
  TimelineRowEntity,
  View,
} from "../types/view";
import { generateUUID } from "./generic";

const VIEW_VERSION: number = 1;

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
): number | null {
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
      const matchingPoint = findMatchingPoint(
        matchingLayer.pointsByField[field],
        index,
        point.x
      );
      if (
        matchingPoint
        // TODO would be nice to refactor this to take in a Point<number, number> where x is milliseconds
        // instead of a timestamp string
      ) {
        newValue += transform.add ? (matchingPoint.y as number) : 0;
        newValue -= transform.subtract ? (matchingPoint.y as number) : 0;
        newValue *= transform.multiply ? (matchingPoint.y as number) : 1;
        newValue /= transform.divide ? (matchingPoint.y as number) : 1;
      } else {
        return null;
      }
    }
  }

  return newValue;
}

/* Find matching point starting at the given index where the point time matches the given ms.
   Scan forwards and then backwards to find the point. If step count is exceeded, bail.
*/
export function findMatchingPoint(
  points: TimeSeriesPoint[],
  index = 0,
  dateString = ""
) {
  const pointAtIndex = points[index];
  if (pointAtIndex && pointAtIndex.x === dateString) {
    return pointAtIndex;
  }

  let step = 0;
  while (step < points.length) {
    const leftPoint = points[index - step];
    if (leftPoint && leftPoint.x === dateString) {
      return leftPoint;
    }
    const rightPoint = points[index + step];
    if (rightPoint && rightPoint.x === dateString) {
      return rightPoint;
    }
    step++;
  }
  return null;
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
): TimeSeriesPoint | null {
  if (!layer.transforms || !layer.transforms.length) return point;
  const field = layer.fields[0]; // TODO pass this in?
  let newPoint = { ...point };

  for (let i = 0; i < layer.transforms.length; i++) {
    const transform = layer.transforms[i];
    const value = newPoint[transform.axis];
    let newX = newPoint.x;
    if (transform.axis === "x") {
      const transformedX = applyLayerTransform(
        new Date(value).getTime(),
        newPoint,
        transform,
        field,
        data,
        index
      );
      if (transformedX === null) {
        return null;
      }
      newX = new Date(transformedX).toISOString().toString();
    }
    let newY = newPoint.y;
    if (transform.axis === "y") {
      const transformedY = applyLayerTransform(
        value as number,
        newPoint,
        transform,
        field,
        data,
        index
      );
      if (transformedY === null) {
        return null;
      }
      newY = transformedY;
    }

    newPoint = {
      ...newPoint,
      x: newX,
      y: newY,
    };
  }

  return newPoint;
}

// TODO move to a more generic utils file?
export function formatYValue(tickValue: number | string): string {
  if (typeof tickValue === "string") {
    return tickValue;
  }
  const formattedValue =
    Math.abs(tickValue) < 0.001 || Math.abs(tickValue) > 9999
      ? format("~e")(tickValue)
      : format("~g")(tickValue);

  return formattedValue.replace("e+0", "");
}

export function createView(): View {
  return {
    config: { sidebarWidth: 200 },
    home: createViewPage({}),
    pageGroups: [],
    version: VIEW_VERSION,
  };
}

export function createViewPage(params: Partial<Page>): Page {
  return {
    dateFormat: "long",
    id: generateUUID(),
    sections: [],
    title: "",
    url: "",
    ...params,
  };
}

export function createViewPageGroup(params: Partial<PageGroup>): PageGroup {
  return {
    id: generateUUID(),
    pages: [],
    title: "",
    url: "",
    ...params,
  };
}

export function duplicateEntity(entity: Entity, section: Section): Section {
  const newId = generateUUID();
  const newEntity = structuredClone(entity);
  newEntity.id = newId;
  const newEntities: Entity[] = section.entities.concat(newEntity);
  const newLayout: SectionLayout[] = [
    ...section.layout,
    { i: newId, w: 4, h: 2, x: 0, y: 0 },
  ];
  return {
    ...section,
    entities: newEntities,
    layout: newLayout,
  };
}

export function duplicateSection(section: Section): Section {
  const newSection = structuredClone(section);
  newSection.id = generateUUID();
  newSection.entities.forEach((entity) => {
    const newId = generateUUID();
    // Find matching entity within layout and map new ID
    newSection.layout.forEach((l) => {
      if (l.i === entity.id) {
        l.i = newId;
      }
    });
    entity.id = newId;
  });
  return newSection;
}
