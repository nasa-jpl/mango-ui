import ChartJS, { ChartDataset, PointStyle } from "chart.js/auto";
import "chartjs-adapter-luxon";
import zoomPlugin from "chartjs-plugin-zoom";
import { debounce } from "lodash-es";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataResponse, Dataset } from "../../../types/api";
import { DateRange } from "../../../types/time";
import { ChartEntity, ChartLayer, YAxis } from "../../../types/view";
import { getData } from "../../../utilities/api";
import {
  getDatasetForLayer,
  getFieldMetadataForLayer,
} from "../../../utilities/dataset";
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
  // TODO could pass in only the list of datasets that this Chart cares about?
  datasets: Dataset[];
  dateRange: DateRange;
};

export type CustomChartData = { x: string; y: number };

export const Chart = ({ chartEntity, datasets, dateRange }: ChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<"line", CustomChartData[]> | null>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>();

  const cancelHandles: Record<string, () => void> = {};

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedVisualizeChartLayers = useCallback(
    debounce(
      (layers, datasets, dateRange) =>
        visualizeChartLayers(
          layers || [],
          datasets,
          dateRange.start,
          dateRange.end
        ),
      100
    ),
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedVisualizeChartLayersTrailing = useCallback(
    debounce(
      (layers, datasets, dateRange) =>
        visualizeChartLayers(
          layers || [],
          datasets,
          dateRange.start,
          dateRange.end
        ),
      500,
      { leading: false, trailing: true }
    ),
    []
  );

  useEffect(() => {
    initializeChart();

    return () => destroyChart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      debouncedVisualizeChartLayers(
        chartEntity.layers || [],
        datasets,
        dateRange
      );
    }
    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(dateRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chartEntity.layers),
    debouncedVisualizeChartLayers,
  ]);

  useEffect(() => {
    configureChartAxes(chartEntity.yAxes || []);

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
    datasets: Dataset[],
    startTime?: string,
    endTime?: string
  ) => {
    if (!chartRef.current) {
      return;
    }
    const hiddenDatasets: Record<string, boolean> = {};
    const chartJSDatasets = chartRef.current.data.datasets;

    chartJSDatasets.forEach((d, i) => {
      // @ts-expect-error can't seem to type extra properties passed into chart js datasets
      if (d.id) {
        // @ts-expect-error can't seem to type extra properties passed into chart js datasets
        hiddenDatasets[d.id] = !chartRef.current?.isDatasetVisible(i) || false;
      }
    });
    const { results, error, aborted } = await fetchAllLayerData(
      layers,
      datasets,
      startTime,
      endTime
    );

    if (error || aborted || !chartRef.current) {
      return;
    }

    const newChartJSDatasets: ChartDataset<"line", CustomChartData[]>[] =
      results.map(({ result, layer }) => {
        // Get metadata for this result layer in order to determine
        // the optimal decimation factor to use when requesting data
        const fieldMetadata = getFieldMetadataForLayer(layer, datasets);

        let data: { x: string; y: number }[] = [];
        result.data.forEach((d) => {
          const fieldValue = d[layer.field];
          const timestamp = d.timestamp;
          if (!fieldValue || typeof timestamp !== "string") return;

          // Case where downsampling is not applied
          let points = [];
          if (result.downsampling_factor === 1) {
            points.push({ x: timestamp, y: fieldValue.value });
          } else {
            if (!fieldMetadata) return;
            if (
              fieldMetadata.supported_aggregations.find((x) => x === "min") &&
              fieldMetadata.supported_aggregations.find((x) => x === "max")
            ) {
              // Compute middle time of aggregation window
              const pointTimestampMS = new Date(timestamp).getTime();
              const halfFieldDataIntervalMS =
                ((result.nominal_data_interval_seconds || 0) / 2) * 1000;
              const middleTime = new Date(
                pointTimestampMS + halfFieldDataIntervalMS
              ).toISOString();

              // Use the min and max set to the middle of the window
              points.push({ x: middleTime, y: fieldValue.min });
              points.push({ x: middleTime, y: fieldValue.max });
            } else if (
              fieldMetadata.supported_aggregations.find((x) => x === "avg")
            ) {
              points.push({ x: timestamp, y: fieldValue.avg });
            }
          }
          points = points.map((point) => {
            // Assume that this is a time series and that x is a date string
            const transform = applyLayerTransform(
              { x: new Date(point.x).getTime(), y: point.y },
              layer
            );
            return {
              x: new Date(transform.x).toISOString(),
              y: transform.y,
            };
          });

          data = data.concat(points);
        });
        return {
          id: getLayerId(layer),
          hidden: hiddenDatasets[getLayerId(layer)] || false,
          // TODO would be nice to render these outside of the canvas in order to better format
          // and control these labels
          // TODO what should these labels contain metadata wise? Fairly verbose right now.
          label: `${layer.mission} ${layer.datasetId} ${layer.field} ${
            layer.streamId
          } (${result.data_count} point${pluralize(result.data_count)}, 1:${
            result.downsampling_factor
          } scale)`,
          data,
          borderWidth:
            typeof layer.lineWidth === "number" ? layer.lineWidth : 1,
          spanGaps: false,
          pointStyle: layer.hidePoints ? (false as PointStyle) : "circle",
          pointRadius:
            typeof layer.pointRadius === "number" ? layer.pointRadius : 1,
          showLine: layer.hideLines ? false : true,
          yAxisID: layer.yAxisId,
          ...(layer.color
            ? { backgroundColor: layer.color, borderColor: layer.color }
            : null),
        };
      });

    // Update chartJS dataset list
    chartRef.current.data.datasets = newChartJSDatasets;

    // Update visibility of each dataset based on old visibility
    // TODO this can be incorrect sometimes if visibility is toggled during load
    chartRef.current.data.datasets.forEach((d, i) => {
      chartRef.current?.setDatasetVisibility(i, !d.hidden);
    });

    if (
      chartRef.current.options.scales &&
      chartRef.current.options.scales.x &&
      layers.length
    ) {
      // Set min and max of the x axis to the requested start and end times
      // with a fallback to the start and end times of the first layer if no
      // start and end times are found
      const computedStartTime = startTime || layers[0].startTime;
      const computedEndTime = endTime || layers[0].endTime;
      chartRef.current.options.scales.x.min = new Date(
        computedStartTime
      ).getTime();
      chartRef.current.options.scales.x.max = new Date(
        computedEndTime
      ).getTime();

      // Set suggested min/max on chart if no points were returned for this time range
      // since otherwise ChartJS will default to today's date when no data are loaded
      if (!results.find((item) => item.result.data_count > 0)) {
        chartRef.current.options.scales.x.suggestedMin = new Date(
          computedStartTime
        );
        chartRef.current.options.scales.x.suggestedMax = new Date(
          computedEndTime
        );
      } else {
        // If we do have points, clear the suggested min/max so that it can be
        // handled automatically by the chart
        chartRef.current.options.scales.x.suggestedMin = undefined;
        chartRef.current.options.scales.x.suggestedMax = undefined;
      }
    }

    // Trigger a chartJS update
    chartRef.current.update();
  };

  const fetchLayerData = (
    layer: ChartLayer,
    datasets: Dataset[],
    startTime: string | undefined,
    endTime: string | undefined
  ): Promise<{ layer: ChartLayer; result: DataResponse }> => {
    /* TODO maybe add the chart ID in here too so we can plot the stream multiple times on the same chart with diff options if needed */
    const layerFullId = `${layer.mission}_${layer.datasetId}_${layer.field}_${layer.streamId}`;
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      const computedStartTime = startTime || layer.startTime;
      const computedEndTime = endTime || layer.endTime;

      // Compute aggregation factor
      const durationSeconds =
        (new Date(computedEndTime).getTime() -
          new Date(computedStartTime).getTime()) /
        1000;

      const chartSize = chartRef.current?.width || 1000; // TODO store in state?

      const dataset = getDatasetForLayer(layer, datasets);
      let downsamplingFactor = 1;
      if (dataset) {
        for (let i = 0; i < dataset.available_resolutions.length; i++) {
          const resolution = dataset.available_resolutions[i];
          const nextResolution = dataset.available_resolutions[i + 1];
          const pointsForDuration =
            durationSeconds / resolution.nominal_data_interval_seconds;
          const nextPointsForDuration = nextResolution
            ? durationSeconds / nextResolution.nominal_data_interval_seconds
            : null;
          if (
            pointsForDuration > chartSize &&
            (nextPointsForDuration == null || nextPointsForDuration < chartSize)
          ) {
            downsamplingFactor = resolution.downsampling_factor;
            break;
          }
        }
      }

      const { json, cancel } = getData(
        layer.mission,
        layer.datasetId,
        layer.streamId,
        layer.field,
        // TODO: check whether or not to sync with page date range
        computedStartTime,
        computedEndTime,
        downsamplingFactor
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
    datasets: Dataset[],
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
        layers.map((layer) =>
          fetchLayerData(layer, datasets, startTime, endTime)
        )
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
    // Only perform an update if the zoom/pan was triggered by the user
    // to prevent loopback after debounced visualizeChartLayers call
    // where this onZoomComplete event will re-fire
    if (chartRef.current && chartRef.current.isZoomedOrPanned()) {
      const { min, max } = chartRef.current.scales.x;
      debouncedVisualizeChartLayersTrailing(
        chartEntity.layers || [],
        datasets,
        { start: new Date(min).toISOString(), end: new Date(max).toISOString() }
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
                // @ts-expect-error can't seem to type extra properties passed into chart js datasets
                `${tooltipItem.dataset.id}: ${tooltipItem.parsed.y}`,
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
      />
      <div className="chart-canvas-container">
        <canvas ref={canvasRef} id={`chart-${chartEntity.id}`} role="img" />
      </div>
    </div>
  );
};

export default Chart;
