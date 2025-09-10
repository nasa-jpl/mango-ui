import { TooltipItem, TooltipModel } from "chart.js";
import React, { useLayoutEffect, useRef, useState } from "react";
import { DataLayer } from "../../../types/view";
import { formatDateGPS } from "../../../utilities/time";
import { formatYValue } from "../../../utilities/view";
import { CustomChartData } from "./Chart";
import "./ChartTooltip.css";

export declare type ChartTooltipPoint = TooltipItem<"line"> & {
  dataset: { layer: DataLayer; unit: string };
};

export declare type ChartTooltipProps = {
  left: number;
  renderHeader?: (point: CustomChartTooltipPoint) => React.ReactNode;
  renderLabel?: (point: CustomChartTooltipPoint) => React.ReactNode;
  tooltip: Omit<TooltipModel<"line">, "dataPoints"> & {
    dataPoints: CustomChartTooltipPoint[];
  };
  top: number;
};

type CustomChartTooltipPoint = ChartTooltipPoint & { raw: CustomChartData };

export const ChartTooltip = ({
  left,
  tooltip,
  top,
  renderHeader: renderHeaderProp,
  renderLabel: renderLabelProp,
}: ChartTooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (ref.current) {
      setDimensions({
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
      });
    }
  }, [tooltip.caretX]);

  if (tooltip.opacity === 0) return;

  const renderHeader = (point: CustomChartTooltipPoint) => {
    if (renderHeaderProp) {
      return renderHeaderProp(point);
    }

    return (
      <>
        {point.dataset.layer.mission} {point.dataset.layer.instrument}{" "}
        {point.dataset.layer.dataset} {point.dataset.layer.fields} (v
        {point.dataset.layer.version}):
      </>
    );
  };

  const renderLabel = (point: CustomChartTooltipPoint) => {
    if (renderLabelProp) {
      return renderLabelProp(point);
    }

    return (
      <>
        {!!point.raw.tooltipLabel && point.raw.tooltipLabel}
        {!point.raw.tooltipLabel && (
          <>
            {formatYValue(point.parsed.y)}
            {point.dataset.unit && ` (${point.dataset.unit})`}
          </>
        )}
      </>
    );
  };

  return (
    <div
      ref={ref}
      className="chart-tooltip"
      style={{
        visibility: dimensions.width < 1 ? "hidden" : "visible",
        left:
          Math.min(
            window.innerWidth - dimensions.width - 20,
            left + window.scrollX - dimensions.width / 2 + tooltip.caretX
          ) + "px",
        top: top + window.scrollY - dimensions.height - -tooltip.caretY - 12,
      }}
    >
      <div className="chart-tooltip-content bg-foreground">
        <div className="chart-tooltip-x text-white font-bold">
          {formatDateGPS(
            new Date(tooltip.dataPoints[0].parsed.x as unknown as number)
          )}
        </div>
        <div className="chart-tooltip-rows">
          {tooltip.dataPoints.map((point, i) => {
            return (
              <div
                className="chart-tooltip-row"
                key={`${i}_${point.dataset.layer.id}`}
              >
                <div
                  className="chart-tooltip-color border-foreground"
                  style={{
                    background: tooltip.labelColors[i].borderColor.toString(),
                  }}
                />
                <div className="chart-tooltip-header font-medium text-white">
                  {renderHeader(point)}
                </div>
                <div className="chart-tooltip-point font-medium text-white">
                  {renderLabel(point)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChartTooltip;
