import { TooltipItem, TooltipModel } from "chart.js";
import classNames from "classnames";
import { useRef } from "react";
import { DataLayer } from "../../../types/view";
import { formatYValue } from "../../../utilities/view";
import "./ChartTooltip.css";

export declare type ChartTooltipProps = {
  left: number;
  tooltip: Omit<TooltipModel<"line">, "dataPoints"> & {
    dataPoints: (TooltipItem<"line"> & {
      dataset: { layer: DataLayer; unit: string };
    })[];
  };
  top: number;
};

export const ChartTooltip = ({ left, tooltip, top }: ChartTooltipProps) => {
  const ref = useRef<HTMLDivElement>(null);
  if (tooltip.opacity === 0) return;
  const leftX =
    left +
    window.scrollX +
    tooltip.caretX +
    (ref.current?.offsetWidth ?? tooltip.width);
  let flip = false;
  if (leftX + 20 > window.innerWidth) {
    flip = true;
  }
  return (
    <div
      ref={ref}
      className={classNames("chart-tooltip", { "chart-tooltip--flip": flip })}
      style={{
        left: left + window.scrollX + tooltip.caretX + "px",
        top: top + window.scrollY + tooltip.caretY + "px",
      }}
    >
      <div className="chart-tooltip-content">
        <div className="chart-tooltip-x st-typography-bold">
          {new Date(
            tooltip.dataPoints[0].parsed.x as unknown as number
          ).toISOString()}
        </div>
        <div className="chart-tooltip-rows">
          {tooltip.dataPoints.map((point, i) => {
            return (
              <div className="chart-tooltip-row" key={point.dataset.layer.id}>
                <div
                  className="chart-tooltip-color"
                  style={{
                    background: tooltip.labelColors[i].borderColor.toString(),
                  }}
                />
                <div className="chart-tooltip-header st-typography-medium">
                  {point.dataset.layer.mission} {point.dataset.layer.instrument}{" "}
                  {point.dataset.layer.dataset} {point.dataset.layer.field} (v
                  {point.dataset.layer.version}):
                </div>
                <div className="chart-tooltip-point st-typography-medium">
                  {formatYValue(point.parsed.y)}
                  {point.dataset.unit && ` (${point.dataset.unit})`}
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
