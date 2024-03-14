/* This file defines a custom plugin for ChartJS */

import { Chart } from "chart.js";

type CustomChartType = Chart<"line"> & {
  hoverCrosshair: { draw?: boolean; x: number; y: number };
};

type HoverCrosshairPluginOptions = {
  color: string;
  enabled: boolean;
  width: number;
};

export const hoverCrosshairPlugin = {
  id: "hoverCrosshair",
  defaults: {
    enabled: true,
    width: 1,
    color: "#969696",
  } as HoverCrosshairPluginOptions,
  afterInit: (chart: CustomChartType) => {
    chart.hoverCrosshair = {
      x: 0,
      y: 0,
    };
  },
  afterEvent: (
    chart: CustomChartType,
    args: {
      event: { x: number | null; y: number | null };
      inChartArea: boolean;
    }
  ) => {
    const { inChartArea } = args;
    const { x, y } = args.event;

    chart.hoverCrosshair = { x: x ?? 0, y: y ?? 0, draw: inChartArea };
    chart.draw();
  },
  afterDatasetsDraw: (
    chart: CustomChartType,
    _: unknown,
    opts: HoverCrosshairPluginOptions
  ) => {
    if (!opts.enabled) return;

    const { ctx } = chart;
    const { top, bottom, left, right } = chart.chartArea;
    const { x, y, draw } = chart.hoverCrosshair;
    if (!draw) return;

    ctx.save();

    ctx.beginPath();
    ctx.lineWidth = opts.width;
    ctx.strokeStyle = opts.color;
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, top);
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);

    ctx.stroke();

    ctx.restore();
  },
};

export default hoverCrosshairPlugin;
