import { scaleTime } from "d3-scale";
import { useCallback, useState } from "react";
import useResizeObserver from "../../../hooks/resizeObserver";
import { Product } from "../../../types/api";
import { ProductPreview } from "../../../types/page";
import { DateRange } from "../../../types/time";
import { TimelineEntity } from "../../../types/view";
import TimelineRow from "../timeline-row/TimelineRow";
import "./Timeline.css";

export declare type TimelineProps = {
  dateRange: DateRange;
  hoverDate: Date | null;
  onDateRangeChange?: (dateRange: DateRange) => void;
  onHoverDateChange?: (date: Date | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  timelineEntity: TimelineEntity;
};

export function Timeline({
  timelineEntity,
  dateRange,
  products,
  hoverDate,
  onDateRangeChange = () => {},
  onHoverDateChange = () => {},
  onSetProductPreview = () => {},
}: TimelineProps) {
  const [width, setWidth] = useState<number>(0);
  const timeScale = scaleTime()
    .domain([new Date(dateRange.start), new Date(dateRange.end)])
    .range([0, width]);
  const ticks = [
    timeScale.nice().domain()[0],
    ...timeScale.ticks(5).slice(1, -1),
    timeScale.nice().domain()[1],
  ];
  const tickFormat = timeScale.tickFormat();

  const onResize = useCallback((target: HTMLDivElement) => {
    // Handle the resize event
    setWidth(target.getBoundingClientRect().width);
  }, []);
  const timeVisualizationRef = useResizeObserver(onResize);

  return (
    <div className="timeline">
      <div className="timeline-time-visualization">
        <div
          className="timeline-time-visualization-label st-typography-medium"
          style={{ width: `${timelineEntity.marginLeft}px` }}
        >
          Date
        </div>
        <div className="st-typography-medium ticks" ref={timeVisualizationRef}>
          {width > 0 &&
            ticks.map((tick, i) => {
              const x = timeScale(tick);
              return (
                <div
                  className="tick"
                  style={{ left: `${(x / width) * 100}%` }}
                  key={`${x}_${i}`}
                >
                  <div className="tick-label">{tickFormat(tick)}</div>
                  <div className="tick-mark" />
                </div>
              );
            })}
        </div>
      </div>
      {timelineEntity.rows.map((row) => {
        return (
          <TimelineRow
            key={row.id}
            timelineRowEntity={row}
            dateRange={dateRange}
            marginLeft={timelineEntity.marginLeft}
            products={products}
            hoverDate={hoverDate}
            onHoverDateChange={onHoverDateChange}
            onDateRangeChange={onDateRangeChange}
            onSetProductPreview={onSetProductPreview}
          />
        );
      })}
    </div>
  );
}

export default Timeline;
