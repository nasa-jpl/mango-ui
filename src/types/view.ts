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

export type EntityType = "chart" | "table" | "map";

export type Entity = {
  dateRange: DateRange;
  id: string;
  syncWithPageDateRange?: boolean;
  title: string;
  type: EntityType;
};

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
  mission: string;
  startTime: string;
  version: string;
};

export interface ChartLayer extends DataLayer {
  color?: string;
  hideLines?: boolean;
  hidePoints?: boolean;
  lineWidth?: number;
  pointRadius?: number;
  transforms?: {
    x?: DataTransform;
    y?: DataTransform;
  };
  type: "line";
  yAxisId?: string;
}

export interface MapLayer extends DataLayer {
  color?: string;
  hidePoints?: boolean;
  pointRadius?: number;
}

export type DataTransform = {
  add?: number;
  divide?: number;
  multiply?: number;
  subtract?: number;
};

export interface MapEntity extends Entity {
  layers?: MapLayer[];
}

export interface TableEntity<T> extends Entity {
  fields: string[];
  rows?: T[];
}
