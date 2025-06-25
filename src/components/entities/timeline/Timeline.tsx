import classNames from "classnames";
import { scaleUtc } from "d3-scale";
import React, { useCallback, useState } from "react";
import useResizeObserver from "../../../hooks/resizeObserver";
import { DateRange } from "../../../types/time";
import "./Timeline.css";

export declare type TimelineProps = {
  children?: React.ReactNode;
  dateRange: DateRange;
  hoverDate: Date | null;
  marginLeft: number;
};

export function Timeline({
  children,
  marginLeft = 120,
  hoverDate,
  dateRange,
}: TimelineProps) {
  const [width, setWidth] = useState<number>(0);
  const timeScale = scaleUtc()
    .domain([new Date(dateRange.start), new Date(dateRange.end)])
    .range([0, width]);

  const ticks = [...timeScale.ticks(5)];

  const tickFormat = timeScale.tickFormat();

  const onResize = useCallback((target: HTMLDivElement) => {
    // Handle the resize event
    setWidth(target.getBoundingClientRect().width);
  }, []);
  const timeVisualizationRef = useResizeObserver(onResize);

  const hoverDateStyles: React.CSSProperties = {};
  let flip = false;
  if (hoverDate) {
    const left = timeScale(hoverDate);
    if (left + 150 > width) {
      flip = true;
      hoverDateStyles.transform = "translateX(-100%)";
    }
  }
  const hoverDateClasses = classNames(
    "timeline-hover-date font-medium text-gray-600",
    {
      "timeline-hover-date--flipped": flip,
    }
  );

  return (
    <div className="timeline">
      <div className="timeline-time-visualization border-b">
        <div
          className="timeline-time-visualization-label font-medium"
          style={{ width: `${marginLeft}px` }}
        >
          Date
        </div>
        <div className="font-medium ticks" ref={timeVisualizationRef}>
          {width > 0 &&
            ticks.map((tick, i) => {
              const x = timeScale(tick);
              return (
                <div
                  className="tick"
                  style={{ left: `${(x / width) * 100}%` }}
                  key={`${x}_${i}`}
                >
                  <div className="tick-label text-secondary-foreground">
                    {tickFormat(tick)}
                  </div>
                  <div className="tick-mark" />
                </div>
              );
            })}
          {hoverDate && (
            <>
              <div
                className={hoverDateClasses}
                style={{
                  position: "absolute",
                  left: `${(timeScale(hoverDate) / width) * 100}%`,
                  ...hoverDateStyles,
                }}
              >
                <div className="timeline-hover-date--text">
                  {hoverDate.toISOString()}
                </div>
              </div>
              <div
                className="tick timeline-hover-date--tick"
                style={{ left: `${(timeScale(hoverDate) / width) * 100}%` }}
              >
                <div className="tick-mark" />
              </div>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default Timeline;
