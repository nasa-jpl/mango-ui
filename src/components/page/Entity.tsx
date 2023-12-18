import {
  ChartEntity,
  Entity as EntityType,
  MapEntity,
  Section as SectionType,
} from "../../types/view";
import Chart from "../entities/chart/Chart";
import Map from "../entities/chart/Map";
import Section from "../ui/Section";
import "./Entity.css";

export declare type EntityProps = {
  entity: EntityType;
};

export const Entity = ({ entity }: EntityProps) => {
  if (entity.type === "section") {
    const section = entity as SectionType;
    return (
      <Section title={entity.title} key={entity.id}>
        {section.entities.length === 0 && <div>No entities</div>}
        {section.entities.map((e) => (
          <Entity entity={e} />
        ))}
      </Section>
    );
  }
  return (
    <div className="entity">
      {entity.type === "chart" && <Chart chartEntity={entity as ChartEntity} />}
      {entity.type === "map" && <Map mapEntity={entity as MapEntity} />}
      {entity.type === "table" && <div>Table</div>}
    </div>
  );
};

export default Entity;
