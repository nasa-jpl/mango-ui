import classNames from "classnames";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Product } from "../../types/api";
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
  dateRange: DateRange;
  entity: EntityType;
  hoverDate: Date | null;
  onDateRangeChange: (dateRange: DateRange) => void;
  onEntityChange: (entity: EntityType) => void;
  onHoverDateChange: (date: Date | null) => void;
  products: Product[];
};

export const Entity = (props: EntityProps) => {
  const {
    products,
    entity,
    dateRange,
    hoverDate,
    className = "",
    onDateRangeChange = () => {},
    onHoverDateChange = () => {},
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
          hoverDate={hoverDate}
          products={products}
          onDateRangeChange={onDateRangeChange}
          onHoverDateChange={onHoverDateChange}
        />
      )}
      {isMapEntity(entity) && (
        <Map mapEntity={entity} products={products} dateRange={dateRange} />
      )}
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
