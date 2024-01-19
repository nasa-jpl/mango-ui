import ChartJS from "chart.js/auto";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import { useEffect, useRef } from "react";
import { DateRange } from "../../../types/time";
import { ChartEntity, ChartLayer, DataResponse } from "../../../types/view";
import { getData } from "../../../utilities/api";
import EntityHeader from "../../page/EntityHeader";
import "./Chart.css";

ChartJS.register(zoomPlugin);

export declare type ChartProps = {
  chartEntity: ChartEntity;
};

export const Chart = ({ chartEntity }: ChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>();
  let timer: NodeJS.Timeout | null;

  const fetchLayerData = (
    layer: ChartLayer,
    dateRange: DateRange
  ): Promise<{ layer: ChartLayer; result: DataResponse }> => {
    return new Promise((resolve, reject) => {
      const { json, target, cancel } = getData(
        layer.mission,
        layer.datasetId,
        layer.streamId,
        dateRange
      );
      json().then(({ result, error }) => {
        if (error) {
          if (error.name === "AbortError") {
            reject("AbortError");
          } else {
            reject(error);
          }
        } else {
          resolve({
            layer,
            result: result as DataResponse,
          });
        }
      });
    });
  };

  /* TODO make a data provider for fetching from API? For now fetch here */
  useEffect(() => {
    const fetchData = async () => {
      const results: { id: string; result: DataResponse }[] =
        await Promise.all<{ id: string; result: DataResponse }>(
          (chartEntity.layers || []).map((layer) =>
            fetchLayerData(layer, {
              start: layer.startTime,
              end: layer.endTime,
            })
          )
        );
      if (chartRef.current) {
        chartRef.current.data.datasets = [];
      }
      results.forEach((result) => {
        addChartLayer(result);
      });
      return;
    };
    fetchData();
  }, [chartEntity.layers]);

  const addChartLayer = (l) => {
    if (chartRef.current) {
      console.log("l :>> ", l);
      chartRef.current.clear();
      chartRef.current.update();
      chartRef.current.data.datasets.push({
        label: l.layer.streamId,
        data: l.result.data.map((x) => ({
          x: new Date(x.timestamp),
          y: x[l.layer.field],
        })),
        pointRadius: 1,
        borderWidth: 1,
        spanGaps: false,
      });
      chartRef.current.update();
    }
  };

  const onZoomComplete = () => {
    if (chartRef.current) {
      const { min, max } = chartRef.current.scales.x;
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(async () => {
        console.log("Fetched data between " + min + " and " + max);
        if (chartRef.current) {
          const newData = await Promise.all(
            (chartEntity.layers || []).map((layer) =>
              fetchLayerData(layer, {
                start: new Date(min).toISOString(),
                end: new Date(max).toISOString(),
              })
            )
          );
          const massaged = newData.map((d) => ({
            label: d.layer.streamId,
            data: d.result.data.map((x) => ({
              x: new Date(x.timestamp),
              y: x[d.layer.field],
            })),
            pointRadius: 1,
            borderWidth: 1,
            spanGaps: false,
          }));
          chartRef.current.data.datasets = massaged;
          chartRef.current.stop(); // make sure animations are not running
          chartRef.current.update();
        }
      }, 1000);
    }
  };

  const initializeChart = () => {
    if (!canvasRef.current) return;
    chartRef.current = new ChartJS(canvasRef.current, {
      type: "line",
      data: {
        datasets: [],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "time",
            ticks: {
              autoSkip: true,
              autoSkipPadding: 50,
              maxRotation: 0,
            },
          },
        },
        plugins: {
          decimation: {
            enabled: true,
            algorithm: "min-max",
          },
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: "xy",
              onZoomComplete: onZoomComplete,
            },
            pan: {
              enabled: true,
              mode: "xy",
              onPanComplete: onZoomComplete,
            },
          },
        },
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
    initializeChart();

    return () => destroyChart();
  }, []);

  return (
    <div className="chart">
      <EntityHeader title={chartEntity.title} />
      <div
        className="chart-canvas-container"
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          minHeight: "300px",
        }}
      >
        <canvas ref={canvasRef} id={`chart-${chartEntity.id}`} role="img" />
      </div>
    </div>
  );
};

export default Chart;
