import classNames from "classnames";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { DataResponseDataEntry, Product } from "../../../types/api";
import { ProductPreview } from "../../../types/page";
import { Status } from "../../../types/status";
import { DateRange } from "../../../types/time";
import { TimelineRowEntity } from "../../../types/view";
import Entity from "../../page/Entity";
import StatusBadge from "../../ui/StatusBadge";
import "./TimelineRow.css";

export declare type TimelineRowProps = {
  dateRange: DateRange;
  hoverDate: Date | null;
  instrument?: string | null;
  loading?: boolean;
  marginLeft: number;
  mission?: string | null;
  onDateRangeChange?: (dateRange: DateRange) => void;
  onHoverDateChange?: (date: Date | null) => void;
  onSelectPoint: (point: DataResponseDataEntry | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  selectedPoint: DataResponseDataEntry | null;
  status?: Status;
  timelineRowEntity: TimelineRowEntity;
};

export function TimelineRow({
  timelineRowEntity,
  dateRange,
  marginLeft,
  products,
  hoverDate,
  selectedPoint,
  mission,
  instrument,
  onDateRangeChange = () => {},
  onHoverDateChange = () => {},
  onSetProductPreview = () => {},
  onSelectPoint = () => {},
  status,
  loading,
}: TimelineRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [subrowExpansionMap, setSubrowExpansionMap] = useState<
    Record<string, boolean>
  >({});

  return (
    <div
      className={classNames("timeline-row", {
        "timeline-row--expanded": expanded,
      })}
    >
      <div className="timeline-row-entity-container">
        <button
          style={{ width: `${marginLeft}px` }}
          className="timeline-row-header st-typography-medium st-button tertiary"
          onClick={() => setExpanded(!expanded)}
        >
          {!expanded && <ChevronRight size={16} />}
          {expanded && <ChevronDown size={16} />}
          {status && <StatusBadge status={status} />}
          {timelineRowEntity.title}
        </button>
        <Entity
          className="timeline-row-entity"
          loading={loading}
          entity={timelineRowEntity.entity}
          dateRange={dateRange}
          hoverDate={hoverDate}
          products={products}
          showHeader={false}
          compact
          mission={mission}
          instrument={instrument}
          onSetProductPreview={onSetProductPreview}
          onDateRangeChange={onDateRangeChange}
          onHoverDateChange={onHoverDateChange}
          onSelectPoint={onSelectPoint}
          selectedPoint={selectedPoint}
        />
      </div>
      {expanded && (
        <div>
          {timelineRowEntity.subrows.map((entity) => {
            const subrowExpanded = subrowExpansionMap[entity.id];
            return (
              <div className="timeline-row-subrow" key={entity.id}>
                <div className="timeline-row-subrow-container">
                  {entity.expandable && (
                    <button
                      style={{ width: `${marginLeft}px` }}
                      className="timeline-row-subrow-title st-typography-medium st-button tertiary"
                      onClick={() =>
                        setSubrowExpansionMap({
                          ...subrowExpansionMap,
                          [entity.id]: !subrowExpansionMap[entity.id],
                        })
                      }
                    >
                      {!subrowExpanded && <ChevronRight size={16} />}
                      {subrowExpanded && <ChevronDown size={16} />}
                      {entity.title}
                    </button>
                  )}
                  {!entity.expandable && (
                    <div
                      style={{ width: `${marginLeft}px` }}
                      className="timeline-row-subrow-title st-typography-medium"
                    >
                      {entity.title}
                    </div>
                  )}
                </div>
                <Entity
                  className={classNames("timeline-subrow-entity", {
                    "timeline-subrow-entity--padded":
                      entity.type === "table" && subrowExpanded,
                  })}
                  entity={entity}
                  loading={loading}
                  dateRange={dateRange}
                  hoverDate={hoverDate}
                  products={products}
                  showHeader={false}
                  compact={!subrowExpanded}
                  mission={mission}
                  instrument={instrument}
                  onSetProductPreview={onSetProductPreview}
                  onDateRangeChange={onDateRangeChange}
                  onHoverDateChange={onHoverDateChange}
                  onSelectPoint={onSelectPoint}
                  selectedPoint={selectedPoint}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TimelineRow;
