import {
  CartesianScaleOptions,
  ChartTypeRegistry,
  TooltipOptions,
} from "chart.js";
import { Layout } from "react-grid-layout";
import { DataResponse, DataResponseDataEntry } from "./api";
import { DateRange } from "./time";

export type View = {
  home: Page;
  pageGroups: PageGroup[];
  version: number;
};

export type PageGroup = {
  id: string;
  pages: Page[];
  title: string;
  url: string;
};

export type Page = {
  dateFormat?: DateFormat;
  id: string;
  missions?: { instrument?: string; mission?: string }[];
  sections: Section[];
  title: string;
  url: string;
};

export type DateFormat = "long" | "short";

export type Section = {
  defaultOpen?: boolean;
  enableHeader?: boolean;
  entities: Entity[];
  fullHeight?: boolean;
  id: string;
  layout: SectionLayout[];
  resizable?: boolean;
  title: string;
};

export type SectionLayout = Pick<Layout, "i" | "w" | "h" | "x" | "y">;

export type EntityType =
  | "chart"
  | "table"
  | "map"
  | "timeline"
  | "timeline-row"
  | "text"
  | "downlink-dashboard";

export type Entity = {
  data?: {
    layer: { id: string } & Partial<DataLayer>;
    result: { data: DataResponse["data"] };
  }[];
  dateRange?: DateRange;
  id: string;
  idField?: string;
  showHeader?: boolean;
  syncWithPageDateRange?: boolean;
  title: string;
  type: EntityType;
};

export interface TimelineRowEntity extends Entity {
  entity: Entity;
  subrows: TimelineRowSubrowEntity<
    TextEntity | TableEntity | ChartEntity | MapEntity
  >[];
}

export type TimelineRowSubrowEntity<EntityType> = EntityType & {
  defaultExpanded?: boolean;
  expandable?: boolean;
};

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

export interface DownlinkDashboardEntity extends Entity {
  dateRange: DateRange;
  defaultFields: string[];
  defaultPassGapLimit: number; // ms limit for gaps between passes
  gapField: string; // e.g. time_gap_max
  instrument: string;
  products: DownlinkDashProduct[];
  type: "downlink-dashboard";
  version: string;
}

export type DownlinkDashProduct = {
  additionalFields?: string[]; // TODO for now we won't figure out all of the thresholding
  dataset: string;
  /** Additional entities to render below the standard set */
  entities?: Entity[];
  passGapLimit?: number; // ms limit for gaps between passes
  showPasses?: boolean;
  title: string;
};

export type YAxis = {
  /** If true, automatically adjust the axis domain to fit the data in view. If false, use the supplied min and max values. */
  autoFitDomain?: boolean;
  color?: string;
  hidden?: boolean;
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
  fields: string[];
  id: string;
  instrument: string;
  label?: string;
  mission: string;
  startTime: string;
  version: string;
  windowBuffer?: number;
};

export type ChartLayer = ChartLayerLine | ChartLayerEvent;
export interface ChartLayerLine extends DataLayer {
  color?: string;
  hidden?: boolean;
  hideLines?: boolean;
  hidePoints?: boolean;
  lineWidth?: number;
  pointRadius?: number;
  transformTargets?: string[];
  transforms?: DataTransform[];
  type: "line";
  yAxisId?: string;
}

export interface ChartLayerEvent extends DataLayer {
  color?: string;
  dataFieldEnd: string;
  dataFieldStart: string;
  hidden?: boolean;
  style: "bubble" | "bar" | "scatter";
  tooltipField?: string;
  // TODO move transforms to DataLayer
  transformTargets?: string[];
  transforms?: DataTransform[];
  type: "event";
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

export type TimeSeriesPoint = Point<string, number | string> & {
  raw: DataResponseDataEntry;
  selected: boolean;
};

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

export type TableColumn = {
  columnGroupId?: string;
  dateFormat?: DateFormat;
  field: string;
  label?: string;
  layerId: string;
};

export type TableColumnGroup = {
  id: string;
  name: string;
};

export interface TableEntity extends Entity {
  applyThresholds?: boolean;
  columnGroups?: TableColumnGroup[];
  columns: TableColumn[];
  compact?: boolean;
  fitToGridWidth?: boolean;
  layers: DataLayer[];
}
