import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nasa-jpl/stellar-react";
import ChartJS, {
  ActiveElement,
  BarOptions,
  ChartDataset,
  ChartEvent,
  Color,
  CommonElementOptions,
  LinearScale,
  LogarithmicScale,
  PointStyle,
  TooltipModel,
} from "chart.js/auto";
import "chartjs-adapter-luxon";
import zoomPlugin from "chartjs-plugin-zoom";
import { Mode } from "chartjs-plugin-zoom/types/options";
import classNames from "classnames";
import { debounce, throttle } from "lodash-es";
import {
  Camera,
  CopyPlus,
  Download,
  MoreVertical,
  Move3D,
  MoveHorizontal,
  MoveVertical,
  Pencil,
  RotateCcw,
  SquareDashedMousePointer,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Root, createRoot } from "react-dom/client";
import {
  DataResponse,
  DataResponseDataEntry,
  Product,
} from "../../../types/api";
import { DateRange } from "../../../types/time";
import {
  ChartEntity,
  ChartLayer,
  TimeSeriesPoint,
  YAxis,
} from "../../../types/view";
import { getData } from "../../../utilities/api";
import {
  convertHexToRGBA,
  getDataLayerId,
  isAbortError,
  pluralize,
} from "../../../utilities/generic";
import {
  getFieldMetadataForLayer,
  getProductForLayer,
} from "../../../utilities/product";
import {
  applyLayerTransforms,
  formatYValue,
  isChartLayerEvent,
  isChartLayerLine,
} from "../../../utilities/view";
import EntityHeader from "../../page/EntityHeader";
import { Tooltip } from "../../ui/Tooltip";
import "./Chart.css";
import ChartTooltip from "./ChartTooltip";

ChartJS.register(zoomPlugin);

let tooltipRoot: Root;

export declare type ChartProps = {
  chartEntity: ChartEntity;
  compact?: boolean;
  dateRange: DateRange;
  hoverDate: Date | null;
  instrument?: string | null;
  loading?: boolean;
  mission?: string | null;
  onDateRangeChange?: (dateRange: DateRange) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onHoverDateChange?: (date: Date | null) => void;
  onSelectPoint?: (point: DataResponseDataEntry | null) => void;
  // TODO could pass in only the list of products that this Chart cares about?
  products: Product[];
  selectedPoint: DataResponseDataEntry | null;
  showHeader?: boolean;
};

export type CustomChartData = {
  data?: TimeSeriesPoint[];
  raw: DataResponseDataEntry;
  selected: boolean;
  tooltipLabel?: string;
  x: string;
  y: number;
};

type CustomChartType = ChartJS<
  "line" | "bar" | "scatter" | "bubble",
  CustomChartData[]
>;

function toDimension(value: number | string, dimension: number) {
  return typeof value === "string" && value.endsWith("%")
    ? (parseFloat(value) / 100) * dimension
    : +value;
}

export const Chart = ({
  chartEntity,
  products,
  dateRange,
  instrument: instrumentProp,
  mission: missionProp,
  compact = false,
  showHeader = true,
  onDateRangeChange = () => {},
  onHoverDateChange = () => {},
  onSelectPoint = () => {},
  hoverDate,
  selectedPoint,
  loading: loadingProp,
}: ChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<CustomChartType | null>();
  const [loading, setLoading] = useState(true);
  const [boxZoomEnabled, setBoxZoomEnabled] = useState(false);
  const [interactionAxes, setInteractionAxes] = useState<Mode>("x");
  const [error, setError] = useState<Error | null>();

  const cancelHandles: Record<string, () => void> = {};

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedVisualizeChartLayers = useCallback(
    debounce(
      (
        layers: ChartLayer[],
        products: Product[],
        chartEntity: ChartEntity,
        dateRange: DateRange,
        mission,
        instrument
      ) =>
        visualizeChartLayers(
          layers || [],
          products,
          chartEntity,
          dateRange.start,
          dateRange.end,
          mission,
          instrument
        ),
      100
    ),
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedVisualizeChartLayersTrailing = useCallback(
    debounce(
      (layers, products, chartEntity, dateRange, mission, instrument) =>
        visualizeChartLayers(
          layers || [],
          products,
          chartEntity,
          dateRange.start,
          dateRange.end,
          mission,
          instrument
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
  }, [compact]);

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
        chartEntity,
        computedDateRange,
        missionProp,
        instrumentProp
      );
    }
    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chartEntity.layers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chartEntity.data),
    chartEntity.syncWithPageDateRange,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(computedDateRange),
    debouncedVisualizeChartLayers,
    compact,
    missionProp,
    instrumentProp,
  ]);

  useEffect(() => {
    configureChartAxes(chartEntity.yAxes || []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chartEntity.yAxes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chartEntity.layers),
    compact,
  ]);

  const onZoomComplete = (
    layers: ChartLayer[],
    products: Product[],
    chartEntity: ChartEntity,
    syncWithDateRange: boolean = true
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
          chartEntity,
          newDateRange,
          missionProp,
          instrumentProp
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
          chartEntity,
          chartEntity.syncWithPageDateRange
        );
      chartRef.current.options.plugins.zoom.zoom.onZoomComplete = () =>
        onZoomComplete(
          chartEntity.layers as ChartLayer[],
          products,
          chartEntity,
          chartEntity.syncWithPageDateRange
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(chartEntity.layers), chartEntity.syncWithPageDateRange]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.data.datasets.forEach((dataset) => {
        dataset.data = dataset.data.map((d) => {
          if (!selectedPoint) {
            d.selected = false;
          } else {
            let selected = false;
            const matchesTimestamp =
              d.raw.timestamp === selectedPoint.timestamp;
            if (matchesTimestamp) {
              // Make sure all fields match
              let allMatching = true;
              Object.keys(d.raw).forEach((key) => {
                if (key === "timestamp") {
                  return;
                }
                if (selectedPoint[key]) {
                  if (selectedPoint[key].value !== d.raw[key].value) {
                    allMatching = false;
                  }
                }
              });
              selected = allMatching;
            }
            d.selected = selected;
          }
          return d;
        });
      });
      chartRef.current.update();
      configureChartAxes(chartEntity.yAxes || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedPoint)]);

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
            associatedLayers[0].fields[0],
            associatedLayers[0],
            products
          );
          axisLabel = metadata?.unit || "";
        }
      }
      const position = axis.position || "left";

      newAxes[axis.id] = {
        display: !compact && !axis.hidden,
        type: axis.type || "linear",
        // type: axis.type || "myscale",
        afterBuildTicks: function (scale: LinearScale | LogarithmicScale) {
          if (!compact || axis.type === "category") return;

          const { min, max } = scale.getMinMax(true);
          scale.min = isFinite(min) ? min : 0;
          scale.max = isFinite(max) ? max : 1;

          if (
            scale.type === "linear" &&
            typeof (scale as LinearScale).options.grace !== "undefined"
          ) {
            const grace = toDimension(
              (scale as LinearScale).options.grace || "",
              1
            );
            scale.min -= scale.min * grace;
            scale.max += scale.max * grace;
          }
        },
        grace: "0.001%",
        position,
        ticks: {
          callback: formatYValue,
        },
        title: { display: !!axisLabel, text: axisLabel, color: axis?.color },
        grid: { display: i === 0 }, // only show horizontal axis ticks for first axis
        ...(axis.min ? { min: axis.min } : null),
        ...(axis.max ? { max: axis.max } : null),
        ...(axis.type === "category" ? { labels: ["bin1"] } : null),
      };
    });
    chartRef.current.config.options.scales = newAxes;
  };

  const visualizeChartLayers = async (
    layers: ChartLayer[],
    products: Product[],
    chartEntity: ChartEntity,
    startTime?: string,
    endTime?: string,
    _mission?: string,
    _instrument?: string
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
      chartEntity,
      startTime,
      endTime,
      _mission,
      _instrument
    );

    if (error || aborted || !chartRef.current) {
      return;
    }
    // Process result points
    const processedData: {
      data_count: number;
      downsampling_factor: number;
      layer: ChartLayer;
      pointsByField: Record<string, CustomChartData[]>;
      unit: string;
    }[] = results.map(({ result, layer }) => {
      // Get metadata for this result layer in order to determine
      // the optimal decimation factor to use when requesting data
      // TODO for time series we could convert date string -> ms and convert back to string later for chartjs?
      // or maybe chartjs is ok with ms though there may be issues with that approach
      const pointsByField: Record<string, CustomChartData[]> = {};
      result.data.forEach((d) => {
        layer.fields.forEach((field) => {
          const fieldMetadata = getFieldMetadataForLayer(
            field,
            layer,
            products
          );
          const fieldValue = d[field];
          const timestamp = d.timestamp;
          if (!fieldValue || typeof timestamp !== "string") return;

          // Case where downsampling is not applied
          const points: CustomChartData[] = [];
          if (result.downsampling_factor === 1) {
            points.push({
              x: timestamp,
              y: fieldValue.value as number,
              raw: d,
              selected: false,
            });
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
              points.push({
                x: middleTime,
                y: fieldValue.min as number,
                raw: d,
                selected: false,
              });
              if (fieldValue.min !== fieldValue.max) {
                points.push({
                  x: middleTime,
                  y: fieldValue.max as number,
                  raw: d,
                  selected: false,
                });
              }
            } else if (
              fieldMetadata.supported_aggregations.find(
                ({ type }) => type === "avg"
              )
            ) {
              points.push({
                x: timestamp,
                y: fieldValue.avg as number,
                raw: d,
                selected: false,
              });
            }
          }
          if (!pointsByField[field]) {
            pointsByField[field] = [];
          }
          pointsByField[field].push(...points);
        });
      });
      const firstFieldMetadata = getFieldMetadataForLayer(
        layer.fields[0],
        layer,
        products
      );
      return {
        layer,
        unit: firstFieldMetadata?.unit || "",
        pointsByField,
        data_count: result.data_count,
        downsampling_factor: result.downsampling_factor,
      };
    });

    // Transformed points
    processedData.forEach(({ layer, pointsByField, ...rest }, i) => {
      const newPointsByField = pointsByField;
      if (layer.transforms?.length) {
        Object.keys(newPointsByField).forEach((key) => {
          const existingData = newPointsByField[key];
          newPointsByField[key] = existingData
            .map((point, j) => {
              // Apply transforms to specified keys or all keys if none specified
              if (
                !layer.transformTargets ||
                (layer.transformTargets &&
                  layer.transformTargets.indexOf(key) > -1)
              ) {
                return applyLayerTransforms(
                  point,
                  layer,
                  processedData,
                  j
                ) as CustomChartData;
              }
              return point;
            })
            .filter((point) => !!point); // filter out null points;
        });
      }
      processedData[i] = { layer, pointsByField: newPointsByField, ...rest };
    });

    // @ts-expect-error TODO chartjs is difficult to type dynamically here
    const newChartJSDatasets: ChartDataset<
      "line" | "bar" | "scatter" | "bubble",
      CustomChartData[]
    >[] = processedData
      .filter(({ layer }) => !layer.hidden)
      .map(
        ({ pointsByField, layer, data_count, downsampling_factor, unit }) => {
          const mission = _mission ?? layer.mission;
          const instrument = _instrument ?? layer.instrument;
          const isLineLayer = isChartLayerLine(layer);
          const isEventLayer = isChartLayerEvent(layer);
          const commonConfig = {
            layer,
            unit,
            id: getDataLayerId(layer),
            hidden: hiddenDatasets[getDataLayerId(layer)] || false,
          };
          if (isLineLayer) {
            const isDownsampled = downsampling_factor !== 1;
            return {
              ...commonConfig, // TODO would be nice to render these outside of the canvas in order to better format
              // and control these labels
              // TODO what should these labels contain metadata wise? Fairly verbose right now.
              data: pointsByField[layer.fields[0]],
              type: "line",
              label:
                layer.label ||
                `${mission} ${instrument} ${layer.dataset} ${layer.fields[0]} ${
                  layer.channels
                    ? `(${layer.channels
                        .map((c) => `${c.id}: ${c.value}`)
                        .join(", ")})`
                    : ""
                } (v${layer.version}) (${data_count} point${pluralize(
                  data_count
                )}, 1:${downsampling_factor} scale)`,
              // smooth the downsampling a tiny fraction to ease artifacting
              tension: isDownsampled ? 0.01 : 0,
              borderWidth:
                typeof layer.lineWidth === "number" ? layer.lineWidth : 1,
              spanGaps: false,
              pointStyle:
                layer.hidePoints || isDownsampled
                  ? (false as PointStyle)
                  : "circle",
              pointRadius: (x: CustomChartData) => {
                if (x.raw?.selected) {
                  return 3;
                }
                return typeof layer.pointRadius === "number"
                  ? layer.pointRadius
                  : 1.25;
              },
              showLine: layer.hideLines ? false : true,
              yAxisID: layer.yAxisId,
              ...(layer.color
                ? {
                    borderColor: layer.color,
                  }
                : null),
              backgroundColor: ((x: CustomChartData) => {
                if (x.raw?.selected) {
                  return "red";
                } else {
                  return layer.color ?? "rgba(0,123,255,1)";
                }
              }) as unknown as Color, // chartjs does not provide correct type for color function, expects string
              borderColor: () => {
                const opacity = isDownsampled ? 1 : 0.8;
                return layer.color
                  ? convertHexToRGBA(layer.color, opacity)
                  : `rgba(0,123,255,${opacity})`;
              },
            };
          } else if (isEventLayer) {
            if (layer.style === "bar" || layer.style === "bubble") {
              // Transform to bar plot format
              const processedPoints: (Omit<CustomChartData, "x" | "y"> & {
                x: string[];
                y: string;
              })[] = [];
              (pointsByField[layer.fields[0]] || []).forEach((_, i) => {
                const startField = layer.dataFieldStart ?? layer.fields[0];
                const endField = layer.dataFieldEnd ?? layer.fields[1];
                const startTime = pointsByField[startField][i].y;
                const endTime = pointsByField[endField][i].y;
                const raw = pointsByField[startField][i].raw;
                processedPoints.push({
                  x: [
                    new Date(startTime).toISOString(),
                    new Date(endTime).toISOString(),
                  ],
                  y: "bin1",
                  raw,
                  selected: false,
                  tooltipLabel:
                    pointsByField[layer.tooltipField || startField][
                      i
                    ].y.toString(),
                });
              });
              return {
                ...commonConfig,
                type: "bar",
                base: 0,
                borderSkipped: false,
                borderRadius: layer.style === "bubble" ? 30 : 0,
                inflateAmount: 0,
                indexAxis: "y",
                yAxisID: layer.yAxisId,
                borderWidth: layer.style === "bubble" ? 1 : 0,
                categoryPercentage: 1,
                borderColor: "#E3B924",
                backgroundColor: ((x: CustomChartData) => {
                  if (x.raw?.selected) {
                    return "rgba(0, 0, 255, 1)";
                  } else {
                    return layer.color ?? "";
                  }
                }) as unknown as Color,
                hoverBackgroundColor: "rgba(0, 0, 255, 0.28)",
                hoverBorderColor: "rgba(0, 0, 255, 1)",
                data: processedPoints,
              } as BarOptions;
            } else if (layer.style === "scatter") {
              const processedPoints: CustomChartData[] = [];
              (pointsByField[layer.fields[0]] || []).forEach((_, i) => {
                // Transform to scatter plot format
                const startField = layer.dataFieldStart ?? layer.fields[0];
                const startTime = pointsByField[startField][i].y;
                const raw = pointsByField[startField][i].raw;
                processedPoints.push({
                  x: new Date(startTime).toISOString(),
                  y: 0,
                  raw,
                  selected: false,
                  tooltipLabel:
                    pointsByField[layer.tooltipField || startField][
                      i
                    ].y.toString(),
                });
              });
              return {
                ...commonConfig,
                type: "scatter",
                indexAxis: "y",
                yAxisID: layer.yAxisId,
                borderWidth: 0,
                categoryPercentage: 1,
                pointRadius: (x: CustomChartData) => {
                  if (x.raw?.selected) {
                    return 6;
                  }
                  return 3;
                },
                borderColor: "#E3B924",
                backgroundColor: ((x: CustomChartData) => {
                  if (x.raw?.selected) {
                    return "rgba(0, 0, 255, 1)";
                  } else {
                    return layer.color ?? "";
                  }
                }) as unknown as Color,
                hoverBackgroundColor: "rgba(0, 0, 255, 0.28)",
                hoverBorderColor: "rgba(0, 0, 255, 1)",
                data: processedPoints,
              } as CommonElementOptions;
            } else {
              return commonConfig;
            }
          }
          return { ...commonConfig, data: [] };
        }
      );

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

    if (
      chartRef.current.options.plugins &&
      chartRef.current.options.plugins.tooltip &&
      chartRef.current.options.plugins.tooltip.external
    ) {
      chartRef.current.options.plugins.tooltip.external = (tooltipModel) => {
        //@ts-expect-error incorrect typings here from library again
        renderTooltip(tooltipModel, _mission, _instrument);
      };
    }

    // Trigger a chartJS update
    chartRef.current.update();
  };

  const fetchLayerData = (
    layer: ChartLayer,
    products: Product[],
    chartEntity: ChartEntity,
    startTime: string | undefined,
    endTime: string | undefined,
    mission?: string,
    instrument?: string
  ): Promise<{ layer: ChartLayer; result: DataResponse }> => {
    const layerFullId = getDataLayerId(layer);
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      let computedStartTime = startTime || layer.startTime;
      let computedEndTime = endTime || layer.endTime;
      if (typeof layer.windowBuffer === "number") {
        const newStartTimeDate = new Date(computedStartTime);
        newStartTimeDate.setDate(newStartTimeDate.getDate() - 1);
        computedStartTime = newStartTimeDate.toISOString();

        const newEndTimeDate = new Date(computedEndTime);
        newEndTimeDate.setDate(newEndTimeDate.getDate() + 1);
        computedEndTime = newEndTimeDate.toISOString();
      }

      // Compute aggregation factor
      const durationSeconds =
        (new Date(computedEndTime).getTime() -
          new Date(computedStartTime).getTime()) /
        1000;

      const chartSize = chartRef.current?.width || 1000; // TODO store in state?

      const product = getProductForLayer(
        {
          ...layer,
          mission: mission ?? layer.mission,
          instrument: instrument ?? layer.instrument,
        },
        products
      );
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

      if (chartEntity.data) {
        const matchingData = chartEntity.data
          ? chartEntity.data.find((d) => d.layer.id === layer.id)
          : null;
        if (matchingData) {
          resolve({ layer, result: matchingData.result as DataResponse });
          return;
        } else {
          reject(new Error("Bad"));
          return;
        }
      }

      const { json, cancel } = getData(
        mission ?? layer.mission,
        layer.dataset,
        instrument ?? layer.instrument,
        layer.version,
        layer.fields,
        layer.channels ?? [],
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

  const onPointClick = (
    _: ChartEvent,
    elements: ActiveElement[],
    chart: CustomChartType
  ) => {
    const element = elements[0];
    if (!element) {
      onSelectPoint(null);
      return;
    }
    const dataset = chart.data.datasets[element.datasetIndex];
    if (!dataset) {
      onSelectPoint(null);
      return;
    }
    const point = dataset.data[element.index];

    if (point) {
      onSelectPoint(point.raw || null);
    }
  };

  const fetchAllLayerData = async (
    layers: ChartLayer[],
    products: Product[],
    chartEntity: ChartEntity,
    startTime?: string,
    endTime?: string,
    mission?: string,
    instrument?: string
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
          fetchLayerData(
            layer,
            products,
            chartEntity,
            startTime,
            endTime,
            mission,
            instrument
          )
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

  const renderTooltip = (
    context: TooltipModel<"line">,
    mission?: string,
    instrument?: string
  ) => {
    //@ts-expect-error incorrect typings from library
    const tooltipModel = context.tooltip;
    const position = context.chart.canvas.getBoundingClientRect();

    // Tooltip Element
    let tooltipEl = document.getElementById("chartjs-tooltip");

    // Create element on first render
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "chartjs-tooltip";
      document.body.appendChild(tooltipEl);
      tooltipRoot = createRoot(tooltipEl!);
    }

    // Render ChartTooltip to the tooltipRoot react container
    tooltipRoot?.render(
      <ChartTooltip
        left={position.left}
        top={position.top}
        tooltip={tooltipModel}
        renderHeader={(point) => (
          <>
            {mission ?? point.dataset.layer.mission}{" "}
            {instrument ?? point.dataset.layer.instrument}{" "}
            {point.dataset.layer.dataset}{" "}
            {point.dataset.layer.fields.length === 1
              ? point.dataset.layer.fields[0]
              : ""}{" "}
            (v
            {point.dataset.layer.version}):
          </>
        )}
      />
    );
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
        layout: {
          autoPadding: !compact,
        },
        //@ts-expect-error internal type checking is overly restrictive
        onClick: onPointClick,
        scales: {
          x: {
            display: !compact,
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
            grid: {
              display: !compact,
            },
          },
          y: {
            type: "linear",
            display: !compact,
            ticks: {
              callback: formatYValue,
              // mirror: compact,
            },
          },
        },
        plugins: {
          legend: {
            display: !compact,
          },
          tooltip: {
            enabled: false,
            xAlign: "left",
            external: (tooltipModel) => {
              //@ts-expect-error incorrect typings here from library again
              renderTooltip(tooltipModel, missionProp, instrumentProp);
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
                  chartEntity,
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
                  chartEntity,
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

  const isLoading = typeof loadingProp === "boolean" ? loadingProp : loading;

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
        {isLoading && (
          <div
            className={classNames(
              "chart-loading-indicator font-medium bg-gray-50 border rounded-sm text-[10px] py-0.5 px-2 pointer-events-none absolute translate-x-[-50%] translate-y-[-50%] text-secondary-foreground",
              { "chart-indicator-overlay--compact": compact }
            )}
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
        {isLoading && error && (
          <div
            className={classNames(
              "font-medium border rounded-sm text-[10px] py-0.5 px-2 pointer-events-none absolute translate-x-[-50%] translate-y-[-50%] bg-red-100 text-red-600 border-red-500 max-w-[310px]",
              { "chart-indicator-overlay--compact": compact }
            )}
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
            <div className="chart-header-buttons border-r">
              <Tooltip content="Reset Y Axis">
                <Button
                  className="h-full w-[28px] rounded-none"
                  onClick={resetPan}
                  variant="ghost"
                  size="icon"
                >
                  <RotateCcw size={16} className="select-none" />
                </Button>
              </Tooltip>
              <Tooltip content={`Cycle Pan & Zoom Axis (${interactionAxes})`}>
                <Button
                  className="h-full w-[28px] rounded-none"
                  onClick={cycleInteractionModes}
                  variant="ghost"
                  size="icon"
                >
                  {interactionAxes === "x" ? (
                    <MoveHorizontal size={16} className="select-none" />
                  ) : interactionAxes === "xy" ? (
                    <Move3D size={16} className="select-none" />
                  ) : (
                    <MoveVertical size={16} className="select-none" />
                  )}
                </Button>
              </Tooltip>
              <Tooltip
                content={
                  !boxZoomEnabled ? "Enable box zoom" : "Disable box zoom"
                }
              >
                <Button
                  className={classNames(
                    "h-full w-[28px] rounded-none",
                    boxZoomEnabled
                      ? "text-primary hover:text-primary border-b border-b-primary"
                      : ""
                  )}
                  onClick={toggleBoxZoom}
                  variant="ghost"
                  size="icon"
                >
                  <SquareDashedMousePointer size={16} className="select-none" />
                </Button>
              </Tooltip>
              <DropdownMenu>
                <Tooltip content="More options">
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="h-full w-[28px] rounded-none"
                      onClick={toggleBoxZoom}
                      variant="ghost"
                      size="icon"
                    >
                      <MoreVertical size={16} className="select-none" />
                    </Button>
                  </DropdownMenuTrigger>
                </Tooltip>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CopyPlus /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download /> Download Data
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Camera /> Snapshot
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      )}
      <div
        className={classNames("chart-canvas-container-padded", {
          "chart-canvas-container-compact": compact,
        })}
      >
        <div className="chart-canvas-container">
          <canvas ref={canvasRef} id={`chart-${chartEntity.id}`} role="img" />
          {renderChartOverlays()}
        </div>
      </div>
    </div>
  );
};

export default Chart;
