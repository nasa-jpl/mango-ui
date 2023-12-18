export type View = {
  home: Page;
  pageGroups: PageGroup[];
};

export type PageGroup = {
  id: string;
  title: string;
  url: string;
  pages: Page[];
};

export type Page = {
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
