export type View = {
  home: ViewPage;
  pageGroups: ViewPageGroup[];
};

export type ViewPageGroup = {
  id: string;
  pages: ViewPage[];
  title: string;
  url: string;
};

export type ViewPage = {
  entities: Entity[];
  id: string;
  title: string;
  url: string;
};

export type EntityType = "section" | "chart" | "table" | "map";

export type Entity = {
  id: string;
  title: string;
  type: EntityType;
  /* TODO time range? */
};

export interface SectionEntity extends Entity {
  entities: Entity[];
  defaultOpen?: boolean;
}

export interface ChartEntity extends Entity {
  datasets?: Dataset[];
  yAxes: any;
  // etc
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
