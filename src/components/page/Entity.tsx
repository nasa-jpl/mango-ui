import classNames from "classnames";
import "react-grid-layout/css/styles.css";
import { DataResponseDataEntry, Product } from "../../types/api";
import { ProductPreview } from "../../types/page";
import { DateRange } from "../../types/time";
import {
  DownlinkDashboardEntity,
  Entity as EntityType,
  LLMPlotGenerationEntity,
  TableEntity,
  TextEntity,
} from "../../types/view";
import {
  isChartEntity,
  isDownlinkDashboardEntity,
  isLLMPlotGenerationEntity,
  isMapEntity,
  isTableEntity,
  isTextEntity,
} from "../../utilities/view";
import Chart from "../entities/chart/Chart";
import Map from "../entities/map/Map";
import Table from "../entities/table/Table";
import Text from "../entities/text/Text";
import { DownlinkDashboard } from "../mission/GRACE/DownlinkDashboard";
import LLMPlotGeneration from "../mission/GRACE/LLMPlotGeneration";
import "./Entity.css";

export declare type EntityProps = {
  className?: string;
  compact?: boolean;
  dateRange: DateRange;
  entity: EntityType;
  hoverDate: Date | null; // TODO could this be Date | undefined and made optional?
  instrument?: string | null;
  loading?: boolean;
  mission?: string | null;
  onDateRangeChange?: (dateRange: DateRange) => void;
  onHoverDateChange?: (date: Date | null) => void;
  onSelectPoint: (point: DataResponseDataEntry | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  selectedPoint: DataResponseDataEntry | null;
  showHeader?: boolean;
};

/* TODO instead of passing dateRange, mission, instrument, etc, consider
  passing some sort of entityOverrides prop that allows the parent to just pass in
  some subset of entity props for override
*/
export const Entity = (props: EntityProps) => {
  const {
    products,
    entity,
    dateRange,
    hoverDate,
    instrument = null,
    mission = null,
    className = "",
    showHeader = entity.showHeader ?? true,
    compact = false,
    onDateRangeChange = () => {},
    onHoverDateChange = () => {},
    onSelectPoint = () => {},
    onSetProductPreview = () => {},
    loading,
    selectedPoint,
  } = props;
  const entityClass = classNames({
    entity: true,
    [className]: !!className,
  });
  return (
    <div className={entityClass}>
      {isChartEntity(entity) && (
        <Chart
          loading={loading}
          chartEntity={entity}
          dateRange={dateRange}
          hoverDate={hoverDate}
          instrument={instrument}
          mission={mission}
          products={products}
          onDateRangeChange={onDateRangeChange}
          onHoverDateChange={onHoverDateChange}
          onSelectPoint={onSelectPoint}
          selectedPoint={selectedPoint}
          showHeader={showHeader}
          compact={compact}
        />
      )}
      {isMapEntity(entity) && (
        <Map mapEntity={entity} products={products} dateRange={dateRange} />
      )}
      {isTableEntity(entity) && (
        <Table
          tableEntity={entity as TableEntity}
          dateRange={dateRange}
          showHeader={showHeader}
          products={products}
          instrument={instrument}
          mission={mission}
          onSetProductPreview={onSetProductPreview}
          onSelectPoint={onSelectPoint}
          selectedPoint={selectedPoint}
          compact={compact}
        />
      )}
      {isTextEntity(entity) && (
        <Text
          showHeader={showHeader}
          textEntity={entity as unknown as TextEntity}
        />
      )}

      {isLLMPlotGenerationEntity(entity) && (
        <LLMPlotGeneration
          llmPlotGenerationEntity={entity as unknown as LLMPlotGenerationEntity}
        />
      )}
      {/* {isTimelineEntity(entity) && (
        <Timeline
          timelineEntity={entity as TimelineEntity}
          dateRange={dateRange}
        />
      )} */}
      {isDownlinkDashboardEntity(entity) && (
        <DownlinkDashboard
          downlinkDashboardEntity={entity as DownlinkDashboardEntity}
          dateRange={dateRange}
          products={products}
          hoverDate={hoverDate}
          instrument={instrument}
          mission={mission}
          onDateRangeChange={onDateRangeChange}
          onHoverDateChange={onHoverDateChange}
          onSelectPoint={onSelectPoint}
          selectedPoint={selectedPoint}
          onSetProductPreview={onSetProductPreview}
        />
      )}
    </div>
  );
};

export default Entity;
