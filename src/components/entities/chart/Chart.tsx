import ChartJS, { ChartDataset, Point, PointStyle } from "chart.js/auto";
import "chartjs-adapter-luxon";
import zoomPlugin from "chartjs-plugin-zoom";
import { debounce } from "lodash-es";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataResponse } from "../../../types/api";
import { DateRange } from "../../../types/time";
import { ChartEntity, ChartLayer, YAxis } from "../../../types/view";
import { getData } from "../../../utilities/api";
import {
  getLayerId,
  isAbortError,
  pluralize,
} from "../../../utilities/generic";
import { applyLayerTransform } from "../../../utilities/view";
import EntityHeader from "../../page/EntityHeader";
import "./Chart.css";
import hoverCrosshairPlugin from "./plugins/hoverCrosshairPlugin";

ChartJS.register(zoomPlugin);
ChartJS.register(hoverCrosshairPlugin);

export declare type ChartProps = {
  chartEntity: ChartEntity;
  dateRange: DateRange;
};

export const Chart = ({ chartEntity, dateRange }: ChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<"line"> | null>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>();
  const [pointCount, setPointCount] = useState(0);
  const cancelHandles: Record<string, () => void> = {};

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedVisualizeChartLayersImmediate = useCallback(
    debounce(
      (layers, dateRange) =>
        visualizeChartLayers(layers || [], dateRange.start, dateRange.end),
      500,
      { leading: true }
    ),
    []
  );

  useEffect(() => {
    initializeChart();

    return () => destroyChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    debouncedVisualizeChartLayersImmediate(chartEntity.layers || [], dateRange);

    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chartEntity.layers),
    dateRange,
    debouncedVisualizeChartLayersImmediate,
  ]);

  useEffect(() => {
    configureChartAxes(chartEntity.yAxes || []);

    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(chartEntity.yAxes)]);

  const configureChartAxes = (yAxes: YAxis[]) => {
    if (
      !chartRef.current ||
      !chartRef.current.config.options ||
      !chartRef.current.config.options.scales
    ) {
      return;
    }
    const newAxes: typeof chartRef.current.config.options.scales = {
      x: chartRef.current.config.options.scales.x,
    };
    yAxes.forEach((axis, i) => {
      const position = axis.position || "left";
      newAxes[axis.id] = {
        type: axis.type || "linear",
        position,
        title: { display: !!axis.label, text: axis.label, color: axis?.color },
        grid: { display: i === 0 }, // only show horizontal axis ticks for first axis
        ...(axis.min ? { min: axis.min } : null),
        ...(axis.max ? { max: axis.max } : null),
      };
    });
    chartRef.current.config.options.scales = newAxes;
  };

  const visualizeChartLayers = async (
    layers: ChartLayer[],
    startTime?: string,
    endTime?: string
  ) => {
    if (!chartRef.current) {
      return;
    }
    const hiddenDatasets: Record<string, boolean> = {};
    const datasets = chartRef.current.data.datasets as (ChartDataset<
      "line",
      (number | Point | null)[]
    > & { id: string })[];
    datasets.forEach((dataset, i) => {
      if (dataset.id) {
        hiddenDatasets[dataset.id] =
          !chartRef.current?.isDatasetVisible(i) || false;
      }
    });
    const { results, error, aborted } = await fetchAllLayerData(
      layers,
      startTime,
      endTime
    );

    if (error || aborted || !chartRef.current) {
      return;
    }

    const chartJSDatasets = results.map(({ result, layer }) => ({
      id: getLayerId(layer),
      hidden: hiddenDatasets[getLayerId(layer)] || false,
      label: layer.streamId,
      data: result.data.map((result) => {
        const point = {
          x: new Date(result.timestamp).getTime(),
          y: result[layer.field] as number,
        };
        return applyLayerTransform(point, layer);
      }),
      borderWidth: typeof layer.lineWidth === "number" ? layer.lineWidth : 1,
      spanGaps: false,
      pointStyle: layer.hidePoints ? (false as PointStyle) : "circle",
      pointRadius:
        typeof layer.pointRadius === "number" ? layer.pointRadius : 1,
      showLine: layer.hideLines ? false : true,
      yAxisID: layer.yAxisId,
      ...(layer.color
        ? { backgroundColor: layer.color, borderColor: layer.color }
        : null),
    }));
    chartRef.current.data.datasets = chartJSDatasets;
    chartRef.current.data.datasets.forEach((d, i) => {
      chartRef.current?.setDatasetVisibility(i, !d.hidden);
    });
    if (chartRef.current.isZoomedOrPanned()) {
      chartRef.current.resetZoom();
    }
    chartRef.current.update();
    const newCount = results
      .map((result) => result.result.data_count)
      .reduce((prev, curr) => prev + curr, 0);
    setPointCount(newCount);
  };

  const debouncedVisualizeChartLayers = debounce(visualizeChartLayers, 500);

  const fetchLayerData = (
    layer: ChartLayer,
    startTime: string | undefined,
    endTime: string | undefined
  ): Promise<{ layer: ChartLayer; result: DataResponse }> => {
    const layerFullId = `${layer.mission}_${layer.datasetId}_${layer.field}_${layer.streamId}`;
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      const { json, cancel } = getData(
        layer.mission,
        layer.datasetId,
        layer.streamId,
        layer.field,
        // TODO: check whether or not to sync with page date range
        startTime || layer.startTime,
        endTime || layer.endTime
      );
      cancelHandles[layerFullId] = cancel;
      json()
        .then((result) => {
          delete cancelHandles[layerFullId];
          resolve({
            layer,
            result,
          });
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            delete cancelHandles[layerFullId];
            reject(error);
          }
        });
    });
  };

  const fetchAllLayerData = async (
    layers: ChartLayer[],
    startTime?: string,
    endTime?: string
  ) => {
    setLoading(true);
    setError(null);
    let results: {
      layer: ChartLayer;
      result: DataResponse;
    }[] = [];
    let aborted = false;
    let error = false;
    try {
      results = await Promise.all(
        layers.map((layer) => fetchLayerData(layer, startTime, endTime))
      );
      setLoading(false);
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err as Error);
        error = true;
        setLoading(false);
      } else {
        aborted = true;
      }
    }
    return { results, aborted, error };
  };

  const onZoomComplete = () => {
    if (chartRef.current) {
      const { min, max } = chartRef.current.scales.x;
      debouncedVisualizeChartLayers(
        chartEntity.layers || [],
        new Date(min).toISOString(),
        new Date(max).toISOString()
      );
    }
  };

  const initializeChart = () => {
    if (!canvasRef.current) {
      return;
    }

    chartRef.current = new ChartJS(canvasRef.current, {
      type: "line",
      data: {
        datasets: [],
      },
      plugins: [hoverCrosshairPlugin],
      options: {
        font: {
          family: "'Inter', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
          size: 11,
          weight: 400,
        },
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            adapters: {
              date: {
                zone: "UTC",
              },
            },
            type: "time",
            ticks: {
              autoSkip: true,
              autoSkipPadding: 50,
              maxRotation: 0,
            },
          },
        },
        plugins: {
          [hoverCrosshairPlugin.id]: {
            enabled: chartEntity.chartOptions?.showCursor || false,
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem) =>
                `${tooltipItem.dataset.label}: ${tooltipItem.parsed.y}`,
            },
            ...(chartEntity.chartOptions?.tooltip || {}),
          },
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
              mode: "x",
              onZoomComplete: onZoomComplete,
            },
            pan: {
              enabled: true,
              mode: "x",
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

  return (
    <div className="chart">
      <EntityHeader
        title={chartEntity.title}
        loading={loading}
        error={error || undefined}
        rightContent={
          !loading && (
            <div className="chart-point-count st-typography-label">
              {pointCount} point{pluralize(pointCount)}
            </div>
          )
        }
      />
      <div className="chart-canvas-container">
        <canvas ref={canvasRef} id={`chart-${chartEntity.id}`} role="img" />
      </div>
    </div>
  );
};

export default Chart;
