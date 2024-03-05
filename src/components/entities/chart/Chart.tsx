import ChartJS, { ChartDataset, Point } from "chart.js/auto";
import "chartjs-adapter-luxon";
import zoomPlugin from "chartjs-plugin-zoom";
import { debounce } from "lodash-es";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChartEntity, ChartLayer, DataResponse } from "../../../types/view";
import { DateRange } from "../../../types/time";
import { getData } from "../../../utilities/api";
import { pluralize } from "../../../utilities/foo";
import { getLayerId, isAbortError } from "../../../utilities/generic";
import EntityHeader from "../../page/EntityHeader";
import "./Chart.css";

ChartJS.register(zoomPlugin);

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
  }, []);

  useEffect(() => {
    debouncedVisualizeChartLayersImmediate(chartEntity.layers || [], dateRange);

    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(chartEntity.layers),
      dateRange,
      debouncedVisualizeChartLayersImmediate,
  ]);

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
      data: result.data.map((x) => ({
        x: x.timestamp as number,
        y: x[layer.field] as number,
      })),
      pointRadius: 1,
      borderWidth: 1,
      spanGaps: false,
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
          tooltip: {
            callbacks: {
              label: (tooltipItem) =>
                `${tooltipItem.dataset.label}: ${tooltipItem.parsed.y}`,
            },
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
