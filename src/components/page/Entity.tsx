import classNames from "classnames";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Dataset } from "../../types/api";
import { DateRange } from "../../types/time";
import { Entity as EntityType, TableEntity } from "../../types/view";
import {
  isChartEntity,
  isMapEntity,
  isTableEntity,
} from "../../utilities/view";
import Chart from "../entities/chart/Chart";
import Map from "../entities/map/Map";
import Table from "../entities/table/Table";
import "./Entity.css";

export declare type EntityProps = {
  className: string;
  datasets: Dataset[];
  dateRange: DateRange;
  entity: EntityType;
  onDateRangeChange: (dateRange: DateRange) => void;
  onEntityChange: (entity: EntityType) => void;
};

export const Entity = (props: EntityProps) => {
  const {
    datasets,
    entity,
    dateRange,
    className = "",
    onDateRangeChange = () => {},
  } = props;
  const entityClass = classNames({
    entity: true,
    [className]: !!className,
  });
  return (
    <div className={entityClass}>
      {isChartEntity(entity) && (
        <Chart
          chartEntity={entity}
          dateRange={dateRange}
          datasets={datasets}
          onDateRangeChange={onDateRangeChange}
        />
      )}
      {isMapEntity(entity) && <Map mapEntity={entity} dateRange={dateRange} />}
      {/* TODO figure out type later/inside table? */}
      {isTableEntity(entity) && (
        <Table
          tableEntity={entity as TableEntity<never>}
          dateRange={dateRange}
        />
      )}
    </div>
  );
};

export default Entity;
