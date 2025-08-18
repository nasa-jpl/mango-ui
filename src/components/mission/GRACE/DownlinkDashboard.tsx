/*
  Control data to download based on date range
  Render a timeline for configured list of products, each with various options and ability to extend table
  Compute gaps and pass as a dataset into various components (as opposed to having them fetch it, need to add support for this)
*/

import { useEffect, useMemo, useState } from "react";
import {
  DataResponse,
  DataResponseDataEntry,
  Product,
} from "../../../types/api";
import { ProductPreview } from "../../../types/page";
import { Status } from "../../../types/status";
import { DateRange } from "../../../types/time";
import {
  ChartEntity,
  DataLayer,
  DownlinkDashboardEntity,
  Entity,
  Entity as EntityType,
  TableEntity,
  TextEntity,
  TimelineRowEntity,
  TimelineRowSubrowEntity,
} from "../../../types/view";
import { getData } from "../../../utilities/api";
import { generateUUID, isAbortError } from "../../../utilities/generic";
import {
  applyFieldThresholds,
  getFieldMetadataForLayer,
} from "../../../utilities/product";
import { j2ToMs } from "../../../utilities/time";
import TimelineRow from "../../entities/timeline-row/TimelineRow";
import Timeline from "../../entities/timeline/Timeline";

export declare type DownlinkDashboardProps = {
  dateBounds: DateRange;
  dateRange: DateRange;
  downlinkDashboardEntity: DownlinkDashboardEntity;
  hoverDate: Date | null;
  instrument?: string | null;
  mission?: string | null;
  onDateRangeChange?: (dateRange: DateRange) => void;
  onHoverDateChange?: (date: Date | null) => void;
  onSelectPoint: (point: DataResponseDataEntry | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  selectedPoint: DataResponseDataEntry | null;
};

type DownlinkDashData = {
  product: string;
  result: DataResponse;
};

export function DownlinkDashboard({
  downlinkDashboardEntity,
  dateRange,
  dateBounds,
  products,
  hoverDate,
  selectedPoint,
  instrument: instrumentProp,
  mission: missionProp,
  onDateRangeChange = () => {},
  onHoverDateChange = () => {},
  onSelectPoint = () => {},
  onSetProductPreview = () => {},
}: DownlinkDashboardProps) {
  const mission = missionProp ?? "GRACEFO";
  const instrument = instrumentProp ?? "C";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>();
  const [data, setData] = useState<{
    gapsBetweenPasses: DownlinkDashData[];
    gapsWithinPasses: DownlinkDashData[];
    passFiles: DownlinkDashData[];
    productReportFiles: DownlinkDashData[];
  }>({
    gapsBetweenPasses: [],
    gapsWithinPasses: [],
    passFiles: [],
    productReportFiles: [],
  });

  const cancelHandles = useMemo(() => {
    return {} as Record<string, () => void>;
  }, []);

  // Manage fetching of pass data
  useEffect(() => {
    fetchAllData(downlinkDashboardEntity, dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(dateRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(downlinkDashboardEntity),
    mission,
    instrument,
  ]);

  async function fetchData(
    product: string,
    downlinkDashboardEntity: DownlinkDashboardEntity,
    additionalFields: string[],
    start: string,
    end: string
  ): Promise<{ product: string; result: DataResponse }> {
    return new Promise((resolve, reject) => {
      // TODO abort stale requests
      const requestId = `${mission}_${product}_${instrument}_${downlinkDashboardEntity.version}`;
      if (cancelHandles[requestId]) {
        cancelHandles[requestId]();
      }

      const { json, cancel } = getData(
        mission || "GRACEFO",
        product,
        instrument,
        downlinkDashboardEntity.version,
        downlinkDashboardEntity.defaultFields.concat(additionalFields),
        [],
        start,
        end
      );
      cancelHandles[requestId] = cancel;
      json()
        .then((result) => {
          delete cancelHandles[requestId];
          resolve({
            product,
            result,
          });
        })
        .catch((error) => {
          if (!isAbortError(error)) {
            delete cancelHandles[requestId];
            reject(error);
          }
        });
    });
  }

  async function fetchAllData(
    downlinkDashboardEntity: DownlinkDashboardEntity,
    dateRange: DateRange
  ) {
    setLoading(true);
    setError(null);
    try {
      let computedStartTime = dateRange.start;
      let computedEndTime = dateRange.end;
      const windowBuffer = 1; // days
      const newStartTimeDate = new Date(computedStartTime);
      newStartTimeDate.setDate(newStartTimeDate.getDate() - windowBuffer);
      computedStartTime = newStartTimeDate.toISOString();

      const newEndTimeDate = new Date(computedEndTime);
      newEndTimeDate.setDate(newEndTimeDate.getDate() + windowBuffer);
      computedEndTime = newEndTimeDate.toISOString();

      // Cancel all previous requests
      Object.values(cancelHandles).map((h) => h());

      // Fetch pass and product reports for every product
      let productReportFiles = await Promise.all(
        downlinkDashboardEntity.products.map((product) =>
          fetchData(
            `${product.dataset}_RPT`,
            downlinkDashboardEntity,
            product.additionalFields || [],
            computedStartTime,
            computedEndTime
          )
        )
      );

      const passFiles = await Promise.all(
        downlinkDashboardEntity.products.map((product) =>
          fetchData(
            `${product.dataset}_PASS`,
            downlinkDashboardEntity,
            product.additionalFields || [],
            computedStartTime,
            computedEndTime
          )
        )
      );

      productReportFiles = productReportFiles.map((productReportFile) => {
        // Filer out files completely out of the time window
        return {
          ...productReportFile,
          result: {
            ...productReportFile.result,
            data: productReportFile.result.data.filter((d) => {
              return (
                new Date(j2ToMs(d.last_data_point_t_tag.value as number)) >=
                  newStartTimeDate &&
                new Date(j2ToMs(d.first_data_point_t_tag.value as number)) <
                  newEndTimeDate
              );
            }),
          },
        };
      });

      passFiles.forEach((passFile) => {
        // Filer out files completely out of the time window
        // Also assign IDs to pass files to ensure uniqueness since pass files can be duplicated
        return {
          ...passFile,
          result: {
            ...passFile.result,
            data: passFile.result.data
              .filter((d) => {
                return (
                  new Date(j2ToMs(d.last_data_point_t_tag.value as number)) >=
                    newStartTimeDate &&
                  new Date(j2ToMs(d.first_data_point_t_tag.value as number)) <
                    newEndTimeDate
                );
              })
              .map((d) => (d.id = { value: generateUUID() })),
          },
        };
      });

      // Compute gaps for every pass
      const gapsWithinPasses = passFiles.map(({ product, result }) => {
        // Pass has a gap if gapField exceeds some gap threshold
        const pseudoLayer: DataLayer = {
          id: "",
          dataset: product,
          startTime: "",
          endTime: "",
          version: "04",
          fields: [downlinkDashboardEntity.gapField],
          mission,
          instrument,
        };
        const metadata = getFieldMetadataForLayer(
          downlinkDashboardEntity.gapField,
          pseudoLayer,
          products
        );
        let gaps: DataResponseDataEntry[] = [];
        if (metadata) {
          // Compute gaps by examining upper limits for each point
          gaps = result.data.filter((d) => {
            const violations = applyFieldThresholds(metadata, d);
            return violations.limits.upper;
          });
        }
        const processedGaps = gaps.map((entry) => {
          return {
            id: entry.id,
            type: { value: "time_gap_max_violation" },
            time_gap_max: { value: entry.time_gap_max.value },
            gap_start_time: {
              value: new Date(
                j2ToMs(
                  ((entry.last_data_point_t_tag.value as number) +
                    (entry.first_data_point_t_tag.value as number)) /
                    2
                )
              ).toISOString(),
            },
            file_name: { value: entry.file_name.value },
            timestamp: entry.timestamp,
          };
        });

        return {
          product,
          result: { ...result, data: processedGaps },
        };
      });

      // Gap detection
      const gapsBetweenPasses = passFiles.map(({ product, result }) => {
        const matchingConfig = downlinkDashboardEntity.products.find(
          (p) => product === `${p.dataset}_PASS`
        );
        const passGapLimit =
          matchingConfig?.passGapLimit ??
          downlinkDashboardEntity.defaultPassGapLimit;
        const gaps: DataResponseDataEntry[] = [];
        if (result.data.length < 1) {
          gaps.push({
            id: { value: generateUUID() },
            type: { value: "pass_gap" },
            gap_start_time: {
              value: newStartTimeDate.toISOString(),
            },
            gap_end_time: {
              value: newEndTimeDate.toISOString(),
            },
            gap_duration: {
              value:
                new Date(newStartTimeDate).getTime() -
                new Date(newEndTimeDate).getTime(),
            },
            timestamp: newStartTimeDate.toISOString(),
          } as DataResponseDataEntry);
        } else {
          result.data
            .sort(
              (a, b) =>
                (a.first_data_point_t_tag.value as number) -
                (b.first_data_point_t_tag.value as number)
            )
            .forEach((data, i) => {
              const dataStartTime = j2ToMs(
                data.first_data_point_t_tag.value as number
              );
              const dataEndTime = j2ToMs(
                data.last_data_point_t_tag.value as number
              );
              const nextDataStartTime =
                j2ToMs(
                  result.data[i + 1]?.first_data_point_t_tag.value as number
                ) || null;

              // TODO catch case of gap before first point?
              if (
                typeof dataEndTime === "number" && // end time exists for this pass
                typeof nextDataStartTime === "number" && // end time exists for next pass
                dataEndTime >= newStartTimeDate.getTime() && // pass is within time window
                dataStartTime < newEndTimeDate.getTime() && // pass is within time window
                nextDataStartTime - dataEndTime > passGapLimit // see if time between next pass start time and current pass end time is greater than gap limit
              ) {
                // See if any other point covers this gap
                let smallestGap = Number.POSITIVE_INFINITY;
                let closestEndTime = null;
                result.data.forEach((_entry) => {
                  const _dataStartTime = j2ToMs(
                    _entry.first_data_point_t_tag.value as number
                  );
                  const _dataEndTime = j2ToMs(
                    _entry.last_data_point_t_tag.value as number
                  );

                  const inTimeWindow =
                    _dataEndTime >= newStartTimeDate.getTime() &&
                    _dataStartTime < newEndTimeDate.getTime(); // pass is within time window
                  const coversStartOfPass = _dataStartTime <= dataStartTime; // pass comes before or at the same time as the current pass in above context

                  if (inTimeWindow && coversStartOfPass) {
                    const difference = nextDataStartTime - _dataEndTime;
                    if (difference < smallestGap) {
                      smallestGap = difference;
                      closestEndTime = _dataEndTime;
                    }
                  }
                });
                const gapCovered = smallestGap <= passGapLimit;
                // TODO make gap rendering configurable
                if (!gapCovered && closestEndTime) {
                  gaps.push({
                    id: { value: generateUUID() },
                    type: { value: "pass_gap" },
                    gap_start_time: {
                      value: new Date(closestEndTime).toISOString(),
                    },
                    gap_end_time: {
                      value: new Date(nextDataStartTime).toISOString(),
                    },
                    gap_duration: {
                      value:
                        new Date(nextDataStartTime).getTime() -
                        new Date(dataEndTime).getTime(),
                    },
                    timestamp: data.timestamp,
                  } as DataResponseDataEntry);
                }
              }
              return gaps;
            });
        }

        return {
          product,
          result: { ...result, data: gaps },
        };
      });
      setData({
        passFiles,
        productReportFiles,
        gapsWithinPasses,
        gapsBetweenPasses,
      });
    } catch (err) {
      console.error(err);
      setError(err as Error);
    }

    setLoading(false);
  }

  const marginLeft = 176;
  const rows = useMemo(() => {
    return downlinkDashboardEntity.products.map((product, i) => {
      const passesForProduct =
        data?.passFiles.find((p) => p.product === `${product.dataset}_PASS`) ??
        null;

      const passes = [
        {
          layer: { id: "passesLayer" },
          result: passesForProduct?.result ?? {
            data: [] as DataResponseDataEntry[],
          },
        },
      ];
      const productReportsForProduct =
        data?.productReportFiles.find(
          (p) => p.product === `${product.dataset}_RPT`
        ) ?? null;
      const productReports = [
        {
          layer: { id: "productReportsLayer" },
          result: productReportsForProduct?.result ?? {
            data: [] as DataResponseDataEntry[],
          },
        },
      ];

      const gapsWithinPassesForProduct =
        data?.gapsWithinPasses.find(
          (p) => p.product === `${product.dataset}_PASS`
        ) ?? null;
      const gapsWithinPasses = [
        {
          layer: { id: "gapsWithinPassesLayer" },
          result: gapsWithinPassesForProduct?.result ?? {
            data: [] as DataResponseDataEntry[],
          },
        },
      ];

      const gapsBetweenPassesForProduct =
        data?.gapsBetweenPasses.find(
          (p) => p.product === `${product.dataset}_PASS`
        ) ?? null;
      const gapsBetweenPasses = [
        {
          layer: { id: "gapsBetweenPassesLayer" },
          result: gapsBetweenPassesForProduct?.result ?? {
            data: [] as DataResponseDataEntry[],
          },
        },
      ];
      const allGapData: Entity["data"] = [
        {
          layer: { id: "allGapsLayer" },
          result: {
            data: gapsBetweenPasses[0].result.data.concat(
              gapsWithinPasses[0].result.data
            ),
          },
        },
      ];

      const matchingProduct = products.find((p) => p.id === product.dataset);

      const textEntity: TimelineRowSubrowEntity<TextEntity> = {
        id: i.toString() + "text",
        type: "text",
        title: "Description",
        text: matchingProduct?.description || "Description not found",
      };
      const gapsTable: TimelineRowSubrowEntity<TableEntity> = {
        id: i.toString() + "gapstable",
        type: "table",
        title: `Gaps (${allGapData[0].result.data.length})`,
        syncWithPageDateRange: true,
        expandable: true,
        compact: true,
        idField: "id",
        data: allGapData,
        layers: [
          {
            id: "allGapsLayer",
            version: "04",
            mission,
            dataset: product.dataset,
            instrument,
            fields: [
              "type",
              "time_gap_max",
              "gap_start_time",
              "gap_end_time",
              "gap_duration",
              "file_name",
              "timestamp",
              "id",
            ],
            startTime: downlinkDashboardEntity.dateRange.start,
            endTime: downlinkDashboardEntity.dateRange.end,
          },
          {
            id: "gapsBetweenPassesLayer",
            version: "04",
            mission,
            dataset: product.dataset,
            instrument,
            fields: [
              "type",
              "time_gap_max",
              "gap_start_time",
              "gap_end_time",
              "gap_duration",
              "file_name",
              "timestamp",
              "id",
            ],
            startTime: downlinkDashboardEntity.dateRange.start,
            endTime: downlinkDashboardEntity.dateRange.end,
          },
        ],
        columns: [
          {
            field: "type",
            layerId: "allGapsLayer",
            label: "Gap Type",
            id: generateUUID(),
          },
          {
            field: "gap_start_time",
            layerId: "allGapsLayer",
            label: "Gap Start Time",
            id: generateUUID(),
          },
          {
            field: "gap_end_time",
            layerId: "allGapsLayer",
            label: "Gap End Time",
            id: generateUUID(),
          },
          {
            field: "gap_duration",
            layerId: "allGapsLayer",
            label: "Gap Duration (ms)",
            id: generateUUID(),
          },
          {
            field: "time_gap_max",
            layerId: "allGapsLayer",
            label: "Time Gap Max",
            id: generateUUID(),
          },
          {
            field: "file_name",
            layerId: "allGapsLayer",
            label: "File Name",
            id: generateUUID(),
          },
          {
            field: "id",
            layerId: "allGapsLayer",
            label: "Id",
            id: generateUUID(),
          },
        ],
      };
      const productFields = downlinkDashboardEntity.defaultFields.concat(
        product.additionalFields || []
      );
      const passesTable: TimelineRowSubrowEntity<TableEntity> = {
        id: i.toString() + "passtable",
        type: "table",
        title: `Passes (${passes[0].result.data.length})`,
        syncWithPageDateRange: true,
        compact: true,
        expandable: true,
        idField: "id",
        data: passes,
        layers: [
          {
            id: "passesLayer",
            version: "04",
            mission,
            dataset: product.dataset + "_PASS",
            instrument,
            fields: [
              ...productFields,
              ...(product.additionalFields || []),
              "id",
            ],
            startTime: downlinkDashboardEntity.dateRange.start,
            endTime: downlinkDashboardEntity.dateRange.end,
          },
        ],
        columns: [...productFields, "id"].map((f) => ({
          field: f,
          layerId: "passesLayer",
          id: generateUUID(),
        })),
      };
      const productReportsTable: TimelineRowSubrowEntity<TableEntity> = {
        id: i.toString() + "productReportsTable",
        type: "table",
        title: `Product Reports (${productReports[0].result.data.length})`,
        syncWithPageDateRange: true,
        expandable: true,
        compact: true,
        idField: "file_name",
        data: productReports,
        layers: [
          {
            id: "productReportsLayer",
            version: "04",
            mission,
            dataset: product.dataset + "_RPT",
            instrument,
            fields: productFields,
            startTime: downlinkDashboardEntity.dateRange.start,
            endTime: downlinkDashboardEntity.dateRange.end,
          },
        ],
        columns: productFields.map((f) => ({
          field: f,
          layerId: "productReportsLayer",
          id: generateUUID(),
        })),
      };
      const gapsChart: TimelineRowSubrowEntity<ChartEntity> = {
        id: "gapsChart",
        type: "chart",
        title: "",
        syncWithPageDateRange: true,
        data: gapsWithinPasses.concat(gapsBetweenPasses),
        layers: [
          {
            id: "gapsWithinPassesLayer",
            mission,
            dataset: "Time Gap Max Violation",
            fields: ["gap_start_time", "gap_end_time", "file_name"],
            dataFieldStart: "gap_start_time",
            dataFieldEnd: "gap_end_time",
            version: "04",
            instrument: "C",
            startTime: "2022-03-02T00:26:00.000000Z",
            endTime: "2022-03-02T00:36:00.000000Z",
            yAxisId: "y1",
            type: "event",
            style: "scatter",
            windowBuffer: 1,
            color: "red",
            tooltipField: "file_name",
          },
          {
            id: "gapsBetweenPassesLayer",
            mission,
            dataset: "Pass Gap",
            fields: ["gap_start_time", "gap_end_time", "file_name"],
            dataFieldStart: "gap_start_time",
            dataFieldEnd: "gap_end_time",
            version: "04",
            instrument: "C",
            startTime: "2022-03-02T00:26:00.000000Z",
            endTime: "2022-03-02T00:36:00.000000Z",
            yAxisId: "y1",
            type: "event",
            style: "bar",
            windowBuffer: 1,
            color: "red",
            // tooltipField: "file_name",
          },
        ],
        yAxes: [
          {
            id: "y1",
            position: "left",
            type: "category",
            hidden: true,
          },
        ],
      };
      const passesChart: TimelineRowSubrowEntity<ChartEntity> = {
        id: "passesChart",
        type: "chart",
        title: `Passes (${passes[0].result.data.length})`,
        syncWithPageDateRange: true,
        data: passes,
        layers: [
          {
            id: "passesLayer",
            mission,
            dataset: "ACC1A_PASS",
            fields: [
              "first_data_point_t_tag",
              "last_data_point_t_tag",
              "file_name",
            ],
            dataFieldStart: "first_data_point_t_tag",
            dataFieldEnd: "last_data_point_t_tag",
            version: "04",
            instrument: "C",
            startTime: "2022-03-02T00:26:00.000000Z",
            endTime: "2022-03-02T00:36:00.000000Z",
            yAxisId: "y2",
            type: "event",
            style: "bubble",
            windowBuffer: 1,
            color: "rgba(227, 185, 36, 0.28)",
            tooltipField: "file_name",
            transformTargets: [
              "first_data_point_t_tag",
              "last_data_point_t_tag",
            ],
            transforms: [
              {
                axis: "y",
                type: "self",
                multiply: 1000,
              },
              {
                axis: "y",
                type: "self",
                add: 946728000000,
              },
            ],
          },
        ],
        yAxes: [
          {
            id: "y2",
            position: "left",
            type: "category",
            hidden: true,
          },
        ],
      };
      const datasetStatus: Status = loading
        ? "loading"
        : allGapData[0].result.data.length || error
        ? "error"
        : "nominal";

      const row: TimelineRowEntity = {
        id: i.toString(),
        type: "timeline-row",
        title: product.dataset,
        entity: gapsChart,
        dateRange: dateRange,
        subrows: [
          textEntity as unknown as EntityType,
          gapsTable,
          passesChart,
          passesTable,
          productReportsTable,
          ...(product.entities || []),
        ],
      };
      return { row, datasetStatus };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downlinkDashboardEntity, data, error]);

  return (
    <Timeline
      marginLeft={marginLeft}
      dateRange={dateRange}
      hoverDate={hoverDate}
    >
      {rows.map(({ row, datasetStatus }) => (
        <TimelineRow
          marginLeft={marginLeft}
          status={datasetStatus}
          loading={loading}
          dateRange={dateRange}
          dateBounds={dateBounds}
          mission={mission}
          instrument={instrument}
          products={products}
          hoverDate={hoverDate}
          onDateRangeChange={onDateRangeChange}
          onHoverDateChange={onHoverDateChange}
          onSetProductPreview={onSetProductPreview}
          onSelectPoint={onSelectPoint}
          selectedPoint={selectedPoint}
          timelineRowEntity={row}
          key={row.id}
        />
      ))}
    </Timeline>
  );
}

export default DownlinkDashboard;
