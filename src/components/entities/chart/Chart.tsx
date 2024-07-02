import { Button, Tooltip } from "@nasa-jpl/react-stellar";
import {
  ArrowCounterClockwise,
  ArrowsHorizontal,
  ArrowsVertical,
  BoundingBox,
  VectorTwo,
} from "@phosphor-icons/react";
import ChartJS, { ChartDataset, PointStyle } from "chart.js/auto";
import "chartjs-adapter-luxon";
import zoomPlugin from "chartjs-plugin-zoom";
import { Mode } from "chartjs-plugin-zoom/types/options";
import { debounce, throttle } from "lodash-es";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataResponse, Product } from "../../../types/api";
import { DateRange } from "../../../types/time";
import { ChartEntity, ChartLayer, YAxis } from "../../../types/view";
import { getData } from "../../../utilities/api";
import {
  getLayerId,
  isAbortError,
  pluralize,
} from "../../../utilities/generic";
import {
  getFieldMetadataForLayer,
  getProductForLayer,
} from "../../../utilities/product";
import { applyLayerTransform, formatYValue } from "../../../utilities/view";
import EntityHeader from "../../page/EntityHeader";
import "./Chart.css";

ChartJS.register(zoomPlugin);

export declare type ChartProps = {
  chartEntity: ChartEntity;
  dateRange: DateRange;
  hoverDate: Date | null;
  onDateRangeChange?: (dateRange: DateRange) => void;
  onHoverDateChange?: (date: Date | null) => void;
  // TODO could pass in only the list of products that this Chart cares about?
  products: Product[];
  showHeader?: boolean;
};

export type CustomChartData = { x: string; y: number };

export const Chart = ({
  chartEntity,
  products,
  dateRange,
  showHeader = true,
  onDateRangeChange = () => {},
  onHoverDateChange = () => {},
  hoverDate,
}: ChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<"line", CustomChartData[]> | null>();
  const [loading, setLoading] = useState(true);
  const [boxZoomEnabled, setBoxZoomEnabled] = useState(false);
  const [interactionAxes, setInteractionAxes] = useState<Mode>("x");
  const [error, setError] = useState<Error | null>();

  const cancelHandles: Record<string, () => void> = {};

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedVisualizeChartLayers = useCallback(
    debounce(
      (layers: ChartLayer[], products: Product[], dateRange: DateRange) =>
        visualizeChartLayers(
          layers || [],
          products,
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
      (layers, products, dateRange) =>
        visualizeChartLayers(
          layers || [],
          products,
          dateRange.start,
          dateRange.end
        ),
      500,
      { leading: false, trailing: true }
    ),
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnDateRangeChange = useCallback(
    debounce((newDateRange) => onDateRangeChange(newDateRange), 500, {
      leading: false,
      trailing: true,
    }),
    []
  );

  useEffect(() => {
    initializeChart();

    return () => destroyChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computedDateRange = useMemo(
    () =>
      chartEntity.syncWithPageDateRange ? dateRange : { start: "", end: "" },
    [chartEntity.syncWithPageDateRange, dateRange]
  );

  useEffect(() => {
    if (chartRef.current) {
      debouncedVisualizeChartLayers(
        chartEntity.layers || [],
        products,
        computedDateRange
      );
    }
    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chartEntity.layers),
    chartEntity.syncWithPageDateRange,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(computedDateRange),
    debouncedVisualizeChartLayers,
  ]);

  useEffect(() => {
    configureChartAxes(chartEntity.yAxes || []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(chartEntity.yAxes), JSON.stringify(chartEntity.layers)]);

  const onZoomComplete = (
    layers: ChartLayer[],
    products: Product[],
    syncWithDateRange = true
  ) => {
    // Only perform an update if the zoom/pan was triggered by the user
    // to prevent loopback after debounced visualizeChartLayers call
    // where this onZoomComplete event will re-fire
    if (chartRef.current && chartRef.current.isZoomedOrPanned()) {
      const { min, max } = chartRef.current.scales.x;
      const newDateRange = {
        start: new Date(min).toISOString(),
        end: new Date(max).toISOString(),
      };
      if (syncWithDateRange) {
        debouncedOnDateRangeChange(newDateRange);
      } else {
        debouncedVisualizeChartLayersTrailing(
          layers || [],
          products,
          newDateRange
        );
      }
    }
  };

  useEffect(() => {
    // Re-assign the zoom callback since it is only defined in the
    // initialization options of the chart
    if (
      chartRef.current &&
      chartEntity.layers !== undefined &&
      chartRef.current.options.plugins?.zoom?.pan &&
      chartRef.current.options.plugins?.zoom?.zoom
    ) {
      chartRef.current.options.plugins.zoom.pan.onPanComplete = () =>
        onZoomComplete(
          chartEntity.layers as ChartLayer[],
          products,
          chartEntity.syncWithPageDateRange
        );
      chartRef.current.options.plugins.zoom.zoom.onZoomComplete = () =>
        onZoomComplete(
          chartEntity.layers as ChartLayer[],
          products,
          chartEntity.syncWithPageDateRange
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(chartEntity.layers), chartEntity.syncWithPageDateRange]);

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
      let axisLabel = axis.label;
      if (!axisLabel) {
        // Find layers associated with this axis
        const associatedLayers = chartEntity.layers?.filter(
          (layer) => layer.yAxisId === axis.id
        );

        if (associatedLayers?.length) {
          // Derive label from first layer
          const metadata = getFieldMetadataForLayer(
            associatedLayers[0],
            products
          );
          axisLabel = metadata?.unit || "";
        }
      }
      const position = axis.position || "left";
      newAxes[axis.id] = {
        type: axis.type || "linear",
        position,
        ticks: {
          callback: formatYValue,
        },
        title: { display: !!axisLabel, text: axisLabel, color: axis?.color },
        grid: { display: i === 0 }, // only show horizontal axis ticks for first axis
        ...(axis.min ? { min: axis.min } : null),
        ...(axis.max ? { max: axis.max } : null),
      };
    });
    chartRef.current.config.options.scales = newAxes;
  };

  const visualizeChartLayers = async (
    layers: ChartLayer[],
    products: Product[],
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
      products,
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
        const fieldMetadata = getFieldMetadataForLayer(layer, products);

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
              fieldMetadata.supported_aggregations.find(
                ({ type }) => type === "min"
              ) &&
              fieldMetadata.supported_aggregations.find(
                ({ type }) => type === "max"
              )
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
              fieldMetadata.supported_aggregations.find(
                ({ type }) => type === "avg"
              )
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
          unit:
            getFieldMetadataForLayer(layer, products)?.unit ||
            "" /* TODO cache this above? */,
          hidden: hiddenDatasets[getLayerId(layer)] || false,
          // TODO would be nice to render these outside of the canvas in order to better format
          // and control these labels
          // TODO what should these labels contain metadata wise? Fairly verbose right now.
          label: `${layer.mission} ${layer.dataset} ${layer.field} ${
            layer.instrument
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
    products: Product[],
    startTime: string | undefined,
    endTime: string | undefined
  ): Promise<{ layer: ChartLayer; result: DataResponse }> => {
    /* TODO maybe add the chart ID in here too so we can plot the dataset multiple times on the same chart with diff options if needed */
    const layerFullId = `${layer.mission}_${layer.dataset}_${layer.field}_${layer.instrument}`;
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

      const product = getProductForLayer(layer, products);
      let downsamplingFactor = 1;
      if (product) {
        for (let i = 0; i < product.available_resolutions.length; i++) {
          const resolution = product.available_resolutions[i];
          const nextResolution = product.available_resolutions[i + 1];
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
        layer.dataset,
        layer.instrument,
        layer.version,
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
    products: Product[],
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
          fetchLayerData(layer, products, startTime, endTime)
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
          y: {
            ticks: {
              callback: formatYValue,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (tooltipItem) => {
                return `${
                  // @ts-expect-error can't seem to type extra properties passed into chart js datasets
                  tooltipItem.dataset.id
                }: ${formatYValue(tooltipItem.parsed.y)}${
                  // @ts-expect-error ^^^
                  tooltipItem.dataset.unit
                    ? // @ts-expect-error ^^^
                      ` (${tooltipItem.dataset.unit})`
                    : ""
                }`;
              },
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
              drag: {
                enabled: true,
                modifierKey: "meta",
              },
              mode: "x",
              onZoomComplete: () => {
                onZoomComplete(
                  chartEntity.layers || [],
                  products,
                  chartEntity.syncWithPageDateRange
                );
              },
            },
            pan: {
              enabled: true,
              mode: "x",
              onPanComplete: () => {
                onZoomComplete(
                  chartEntity.layers || [],
                  products,
                  chartEntity.syncWithPageDateRange
                );
              },
            },
          },
        },
      },
    });

    chartRef.current.canvas.onmousemove = (e) => throttledOnChartMouseMove(e);
    chartRef.current.canvas.onmouseleave = (e) => onChartMouseMove(e);
  };

  const onChartMouseMove = (event: MouseEvent) => {
    if (
      chartRef.current?.isPointInArea({
        x: event.offsetX,
        y: event.offsetY,
      })
    ) {
      const newX = chartRef.current?.scales.x.getValueForPixel(event.offsetX);
      if (typeof newX === "number") {
        onHoverDateChange(new Date(newX));
        return;
      }
    }
    onHoverDateChange(null);
  };

  const throttledOnChartMouseMove = throttle(onChartMouseMove, 0, {
    leading: true,
    trailing: true,
  });

  const destroyChart = () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
  };

  const setChartBoxZoomEnabled = (enabled: boolean) => {
    if (
      chartRef.current &&
      chartRef.current.options.plugins?.zoom?.zoom?.drag &&
      chartRef.current.options.plugins?.zoom?.pan
    ) {
      // Zoom configuration
      chartRef.current.options.plugins.zoom.zoom.drag.modifierKey = enabled
        ? undefined
        : "meta";

      // Pan configuration
      // chartRef.current.options.plugins.zoom.pan.enabled = true;
      chartRef.current.options.plugins.zoom.pan.modifierKey = enabled
        ? "meta"
        : undefined;

      // Trigger a chartJS update
      chartRef.current.update();
    }
  };

  const toggleBoxZoom = () => {
    setChartBoxZoomEnabled(!boxZoomEnabled);
    setBoxZoomEnabled(!boxZoomEnabled);
  };

  const setChartInteractionAxes = (mode: Mode) => {
    if (
      chartRef.current &&
      chartRef.current.options.plugins?.zoom?.zoom?.drag &&
      chartRef.current.options.plugins?.zoom?.pan
    ) {
      // Zoom configuration
      chartRef.current.options.plugins.zoom.zoom.mode = mode;
      chartRef.current.options.plugins.zoom.pan.mode = mode;

      // Trigger a chartJS update
      chartRef.current.update();
    }
  };

  const cycleInteractionModes = () => {
    let newInteractionAxes: Mode = "x";
    if (interactionAxes === "x") {
      newInteractionAxes = "y";
    } else if (interactionAxes === "y") {
      newInteractionAxes = "xy";
    } else {
      newInteractionAxes = "x";
    }
    setInteractionAxes(newInteractionAxes);
    setChartInteractionAxes(newInteractionAxes);
  };

  const resetPan = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const renderChartOverlays = () => {
    if (!chartRef.current) {
      return;
    }
    return (
      <>
        {hoverDate && !boxZoomEnabled && (
          <div
            className="chart-cursor-container"
            style={{
              top: `${chartRef.current.chartArea.top}px`,
              width: `${chartRef.current.chartArea.width}px`,
              left: `${chartRef.current.chartArea.left}px`,
              height: `${chartRef.current.chartArea.height}px`,
            }}
          >
            <div
              className="chart-cursor"
              style={{
                left: `${
                  chartRef.current.scales.x.getPixelForValue(
                    hoverDate.getTime()
                  ) - chartRef.current.chartArea.left
                }px`,
              }}
            />
          </div>
        )}
        {loading && (
          <div
            className="chart-indicator-overlay chart-loading-indicator st-typography-medium"
            style={{
              top: `${
                chartRef.current.chartArea.top +
                chartRef.current.chartArea.height / 2
              }px`,
              left: `${
                chartRef.current.chartArea.left +
                chartRef.current.chartArea.width / 2
              }px`,
            }}
          >
            Loading
          </div>
        )}
        {!loading && error && (
          <div
            className="chart-indicator-overlay chart-error-indicator st-typography-medium"
            style={{
              top: `${
                chartRef.current.chartArea.top +
                chartRef.current.chartArea.height / 2
              }px`,
              left: `${
                chartRef.current.chartArea.left +
                chartRef.current.chartArea.width / 2
              }px`,
            }}
          >
            Error: {error.message}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="chart">
      {showHeader && (
        <EntityHeader
          title={chartEntity.title}
          rightContent={
            <div className="chart-header-buttons">
              <Tooltip content="Reset Y Axis">
                <Button
                  className="chart-button"
                  onClick={resetPan}
                  variant="icon"
                  icon={<ArrowCounterClockwise weight="regular" size={16} />}
                />
              </Tooltip>
              <Tooltip content={`Cycle Pan & Zoom Axis (${interactionAxes})`}>
                <Button
                  className="chart-button"
                  onClick={cycleInteractionModes}
                  variant="icon"
                  icon={
                    interactionAxes === "x" ? (
                      <ArrowsHorizontal weight="regular" size={16} />
                    ) : interactionAxes === "xy" ? (
                      <VectorTwo weight="regular" size={16} />
                    ) : (
                      <ArrowsVertical weight="regular" size={16} />
                    )
                  }
                />
              </Tooltip>
              <Tooltip
                content={
                  !boxZoomEnabled ? "Enable box zoom" : "Disable box zoom"
                }
              >
                <Button
                  className={
                    boxZoomEnabled
                      ? "chart-button chart-button-active"
                      : "chart-button"
                  }
                  onClick={toggleBoxZoom}
                  variant="icon"
                  icon={<BoundingBox weight="regular" size={16} />}
                />
              </Tooltip>
            </div>
          }
        />
      )}
      <div className="chart-canvas-container-padded">
        <div className="chart-canvas-container">
          <canvas ref={canvasRef} id={`chart-${chartEntity.id}`} role="img" />
          {renderChartOverlays()}
        </div>
      </div>
    </div>
  );
};

export default Chart;
