export type View = {
  home: Entity[];
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
  entities: Entity[];
};

export type EntityType = "section" | "chart" | "table" | "map";

export type Entity = {
  id: string;
  title: string;
  type: EntityType;
};

export interface Section extends Entity {
  entities: Entity[];
}

export interface Chart extends Entity {
  yAxes: any;
  // etc
}
