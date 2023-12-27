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

export interface TableEntity extends Entity {
  datasets?: Dataset[];
  fields: string[];
}

/* TODO move to a separate file? */
export type Dataset = {
  id: string;
  name: string;
  mission: string;
};
