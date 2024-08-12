import classNames from "classnames";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Product } from "../../types/api";
import { ProductPreview } from "../../types/page";
import { DateRange } from "../../types/time";
import {
  Entity as EntityType,
  TableEntity,
  TextEntity,
  TimelineEntity,
} from "../../types/view";
import {
  isChartEntity,
  isMapEntity,
  isTableEntity,
  isTextEntity,
  isTimelineEntity,
} from "../../utilities/view";
import Chart from "../entities/chart/Chart";
import Map from "../entities/map/Map";
import Table from "../entities/table/Table";
import Text from "../entities/text/Text";
import Timeline from "../entities/timeline/Timeline";
import "./Entity.css";

export declare type EntityProps = {
  className?: string;
  compact?: boolean;
  dateRange: DateRange;
  entity: EntityType;
  hoverDate: Date | null; // TODO could this be Date | undefined and made optional?
  onDateRangeChange?: (dateRange: DateRange) => void;
  onHoverDateChange?: (date: Date | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  showHeader?: boolean;
};

export const Entity = (props: EntityProps) => {
  const {
    products,
    entity,
    dateRange,
    hoverDate,
    className = "",
    showHeader = true,
    compact = false,
    onDateRangeChange = () => {},
    onHoverDateChange = () => {},
    onSetProductPreview = () => {},
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
          showHeader={showHeader}
          compact={compact}
        />
      )}
      {isMapEntity(entity) && (
        <Map mapEntity={entity} products={products} dateRange={dateRange} />
      )}
      {/* TODO figure out type later/inside table? */}
      {isTableEntity(entity) && (
        <Table
          tableEntity={entity as TableEntity}
          dateRange={dateRange}
          showHeader={showHeader}
          products={products}
          onSetProductPreview={onSetProductPreview}
        />
      )}
      {isTextEntity(entity) && (
        <Text
          showHeader={showHeader}
          textEntity={entity as unknown as TextEntity}
        />
      )}
      {isTimelineEntity(entity) && (
        <Timeline
          timelineEntity={entity as TimelineEntity}
          dateRange={dateRange}
          products={products}
          hoverDate={hoverDate}
          onDateRangeChange={onDateRangeChange}
          onHoverDateChange={onHoverDateChange}
          onSetProductPreview={onSetProductPreview}
        />
      )}
    </div>
  );
};

export default Entity;
