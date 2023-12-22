export type View = {
  home: ViewPage;
  pageGroups: ViewPageGroup[];
};

export type ViewPageGroup = {
  id: string;
  title: string;
  url: string;
  pages: ViewPage[];
};

export type ViewPage = {
  id: string;
  title: string;
  url: string;
  entities: Entity[];
};

export type EntityType = "section" | "chart" | "table" | "map";

export type Entity = {
  id: string;
  title: string;
  type: EntityType;
  datasets?: Dataset[];
};

export interface SectionEntity extends Entity {
  entities: Entity[];
}

export interface ChartEntity extends Entity {
  yAxes: any;
  // etc
}

export interface MapEntity extends Entity {
  // etc
}

export interface TableEntity extends Entity {}

/* TODO move to a separate file? */
export type Dataset = {
  id: string;
  name: string;
  mission: string;
};
