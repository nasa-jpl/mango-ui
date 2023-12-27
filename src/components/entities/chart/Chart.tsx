import ChartJS from "chart.js/auto";
import { useEffect, useRef } from "react";
import { ChartEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";

import "./Chart.css";

export declare type ChartProps = {
  chartEntity: ChartEntity;
};

export const Chart = ({ chartEntity }: ChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>();

  const renderChart = () => {
    if (!canvasRef.current) return;

    const data = [
      { year: 2010, count: 10 },
      { year: 2011, count: 20 },
      { year: 2012, count: 15 },
      { year: 2013, count: 25 },
      { year: 2014, count: 22 },
      { year: 2015, count: 30 },
      { year: 2016, count: 28 },
    ];

    chartRef.current = new ChartJS(canvasRef.current, {
      type: "line",
      data: {
        labels: data.map((row) => row.year),
        datasets: [
          {
            label: "Acquisitions by year",
            data: data.map((row) => row.count),
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  };

  const destroyChart = () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
  };

  useEffect(() => {
    renderChart();

    return () => destroyChart();
  }, []);

  return (
    <div className="chart">
      <EntityHeader title={chartEntity.title} />
      <div
        className="chart-canvas-container"
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <canvas ref={canvasRef} id={`chart-${chartEntity.id}`} role="img" />
      </div>
    </div>
  );
};

export default Chart;
