import { Layout } from "react-grid-layout";

export type View = {
  home: View;
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
  id: string;
  title: string;
  type: EntityType;
  /* TODO time range? */
};

export interface ChartEntity extends Entity {
  layers?: ChartLayer[];
  yAxes: any;
  // etc
}

export type DataLayer = {
  datasetId: string;
  endTime: string;
  field: string;
  id: string;
  mission: string;
  startTime: string;
  streamId: string;
};

export interface ChartLayer extends DataLayer {
  type: "line";
}

export interface MapEntity extends Entity {
  // etc
}

export interface TableEntity<T> extends Entity {
  fields: string[];
  rows?: T[];
}

/* TODO move to a separate file? */
export type Dataset = {
  available_fields: string[];
  full_id: string; // <mission>_<dataset_id>
  id: string;
  mission: string;
  streams: Stream[];
  timestamp_field: string; // the field in this dataset that denotes the time axis
};

export interface DatasetStream extends Omit<Dataset, "streams"> {
  data_begin: string;
  data_end: string;
  streamId: string;
}

export type Stream = {
  data_begin: string; // timestamp
  data_end: string; // timestamp
  id: string;
};

/* TODO move to an API type file */
export type DataResponse = {
  data: Record<string, number | string>[];
  data_begin: string;
  data_count: number;
  data_end: string;
  from_isotimestamp: string;
  query_elapsed_ms: number;
  to_isotimestamp: string;
};

export type DataResponseError = {
  detail: string;
};
