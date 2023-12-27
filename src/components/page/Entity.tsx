import {
  ChartEntity,
  Entity as EntityType,
  MapEntity,
  SectionEntity,
  TableEntity,
} from "../../types/view";
import Chart from "../entities/chart/Chart";
import Map from "../entities/map/Map";
import Table from "../entities/table/Table";
import Section from "../ui/Section";
import "./Entity.css";

export declare type EntityProps = {
  entity: EntityType;
};

export const Entity = ({ entity }: EntityProps) => {
  if (entity.type === "section") {
    const section = entity as SectionEntity;
    return (
      <Section
        title={section.title}
        key={section.id}
        defaultOpen={section.defaultOpen}
      >
        {section.entities.length === 0 && <div>No entities</div>}
        {section.entities.map((e) => (
          <Entity key={e.id} entity={e} />
        ))}
      </Section>
    );
  }
  return (
    <div className="entity">
      {entity.type === "chart" && <Chart chartEntity={entity as ChartEntity} />}
      {entity.type === "map" && <Map mapEntity={entity as MapEntity} />}
      {entity.type === "table" && <Table tableEntity={entity as TableEntity} />}
    </div>
  );
};

export default Entity;
