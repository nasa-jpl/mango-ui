import { Button } from "@nasa-jpl/stellar-react";
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
        <Button
          variant="ghost"
          style={{ width: `${marginLeft}px` }}
          className="timeline-row-header font-medium py-0 px-2"
          onClick={() => setExpanded(!expanded)}
        >
          {!expanded && <ChevronRight size={16} />}
          {expanded && <ChevronDown size={16} />}
          {status && <StatusBadge status={status} />}
          {timelineRowEntity.title}
        </Button>
        <Entity
          className="border-none rounded-none"
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
                <div className="shadow-[inset_-1px_0_0_0_currentcolor] shadow-border">
                  {entity.expandable && (
                    <Button
                      variant="ghost"
                      style={{ width: `${marginLeft}px` }}
                      className="timeline-row-subrow-title py-0 px-2 "
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
                    </Button>
                  )}
                  {!entity.expandable && (
                    <div
                      style={{ width: `${marginLeft}px` }}
                      className="timeline-row-subrow-title font-medium py-0 px-2"
                    >
                      {entity.title}
                    </div>
                  )}
                </div>
                <Entity
                  className={classNames(
                    "bg-secondary border-none rounded-none",
                    {
                      "p-2 [&_.ag-theme-stellar]:border rounded overflow-hidden":
                        entity.type === "table" && subrowExpanded,
                    }
                  )}
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
