import {
  CartesianScaleOptions,
  ChartTypeRegistry,
  TooltipOptions,
} from "chart.js";
import { Layout } from "react-grid-layout";
import { DateRange } from "./time";

export type View = {
  home: Page;
  pageGroups: PageGroup[];
};

export type PageGroup = {
  id: string;
  pages: Page[];
  title: string;
  url: string;
};

export type Page = {
  id: string;
  sections: Section[];
  title: string;
  url: string;
};

export type Section = {
  defaultOpen?: boolean;
  enableHeader?: boolean;
  entities: Entity[];
  id: string;
  layout: SectionLayout[];
  title: string;
};

export type SectionLayout = Pick<Layout, "i" | "w" | "h" | "x" | "y">;

export type EntityType =
  | "chart"
  | "table"
  | "map"
  | "timeline"
  | "timeline-row"
  | "text";

export type Entity = {
  dateRange: DateRange;
  id: string;
  syncWithPageDateRange?: boolean;
  title: string;
  type: EntityType;
};

export interface TimelineEntity extends Entity {
  marginLeft: number;
  rows: TimelineRowEntity[];
}

export interface TimelineRowEntity extends Entity {
  entity: Entity;
  subrows: Entity[];
}

export interface TextEntity extends Omit<Entity, "dateRange"> {
  text: string;
}

export interface ChartEntity extends Entity {
  chartOptions?: ChartOptions;
  layers?: ChartLayer[];
  yAxes?: YAxis[];
}

export type ChartOptions = {
  tooltip?: {
    intersect?: TooltipOptions["intersect"];
    mode?: TooltipOptions["mode"];
  };
};

export type YAxis = {
  /** If true, automatically adjust the axis domain to fit the data in view. If false, use the supplied min and max values. */
  autoFitDomain?: boolean;
  color?: string;
  id: string;
  label?: string;
  max?: number;
  min?: number;
  position?: CartesianScaleOptions["position"];
  /** Axis type, defaults to linear */
  type?: ChartTypeRegistry["line"]["scales"];
};

export type DataLayer = {
  dataset: string;
  endTime: string;
  field: string;
  id: string;
  instrument: string;
  label?: string;
  mission: string;
  startTime: string;
  version: string;
};

export interface ChartLayer extends DataLayer {
  color?: string;
  hidden?: boolean;
  hideLines?: boolean;
  hidePoints?: boolean;
  lineWidth?: number;
  pointRadius?: number;
  transforms?: DataTransform[];
  type: "line";
  yAxisId?: string;
}

export interface MapLayer extends DataLayer {
  color?: string;
  hidePoints?: boolean;
  pointRadius?: number;
}

export type Point<X = string, Y = number> = {
  x: X;
  y: Y;
};

export type TimeSeriesPoint = Point<string, number>;

export type DataTransform = { axis: "x" | "y" } & (
  | DataTransformSelf
  | DataTransformDerived
);

export type DataTransformSelf = {
  add?: number;
  divide?: number;
  multiply?: number;
  subtract?: number;
  type: "self";
};

export type DataTransformDerived = {
  add?: boolean;
  divide?: boolean;
  layerId: DataLayer["id"];
  multiply?: boolean;
  subtract?: boolean;
  type: "derived";
};

export interface MapEntity extends Entity {
  layers?: MapLayer[];
}

export interface TableLayer extends Omit<DataLayer, "field"> {
  fields: string[];
}

export type TableColumn = {
  field: string;
  layerId: string;
};

export interface TableEntity extends Entity {
  columns: TableColumn[];
  layers: TableLayer[];
}
