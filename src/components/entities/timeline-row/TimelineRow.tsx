import { IconCaretDown, IconCaretRight } from "@nasa-jpl/react-stellar";
import classNames from "classnames";
import { useState } from "react";
import { Product } from "../../../types/api";
import { ProductPreview } from "../../../types/page";
import { DateRange } from "../../../types/time";
import { TimelineRowEntity } from "../../../types/view";
import Entity from "../../page/Entity";
import "./TimelineRow.css";

export declare type TimelineRowProps = {
  dateRange: DateRange;
  hoverDate: Date | null;
  marginLeft: number;
  onDateRangeChange?: (dateRange: DateRange) => void;
  onHoverDateChange?: (date: Date | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  timelineRowEntity: TimelineRowEntity;
};

export function TimelineRow({
  timelineRowEntity,
  dateRange,
  marginLeft,
  products,
  hoverDate,
  onDateRangeChange = () => {},
  onHoverDateChange = () => {},
  onSetProductPreview = () => {},
}: TimelineRowProps) {
  const [expanded, setExpanded] = useState(false);

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
          {!expanded && <IconCaretRight />}
          {expanded && <IconCaretDown />}
          {timelineRowEntity.title}
        </button>
        <Entity
          className="timeline-row-entity"
          entity={timelineRowEntity.entity}
          dateRange={dateRange}
          hoverDate={hoverDate}
          products={products}
          showHeader={false}
          compact
          onSetProductPreview={onSetProductPreview}
          onDateRangeChange={onDateRangeChange}
          onHoverDateChange={onHoverDateChange}
        />
      </div>
      {expanded && (
        <div>
          {timelineRowEntity.subrows.map((entity) => {
            return (
              <div className="timeline-row-subrow">
                <div
                  className="timeline-row-subrow-header st-typography-label"
                  style={{ width: `${marginLeft}px` }}
                >
                  {entity.title}
                </div>
                <Entity
                  className={classNames("timeline-subrow-entity", {
                    "timeline-subrow-entity--padded": entity.type === "table",
                  })}
                  entity={entity}
                  dateRange={dateRange}
                  hoverDate={hoverDate}
                  products={products}
                  showHeader={false}
                  compact
                  onSetProductPreview={onSetProductPreview}
                  onDateRangeChange={onDateRangeChange}
                  onHoverDateChange={onHoverDateChange}
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
