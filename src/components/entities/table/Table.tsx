import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nasa-jpl/stellar-react";
import type { ColGroupDef, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import { debounce } from "lodash-es";
import { CopyPlus, FilterX, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  DataResponse,
  DataResponseDataEntry,
  Product,
  ProductField,
} from "../../../types/api";
import {
  ComputedThresholds,
  ProcessedDataResponseDataEntry,
} from "../../../types/app.ts";
import { DataGridColumnDef } from "../../../types/data-grid";
import { ProductPreview } from "../../../types/page.ts";
import { Status } from "../../../types/status.ts";
import { DateRange } from "../../../types/time";
import { DataLayer, TableEntity } from "../../../types/view";
import { getData } from "../../../utilities/api";
import { getDataLayerId, isAbortError } from "../../../utilities/generic";
import {
  applyFieldThresholds,
  getFieldMetadataForLayer,
  getProductForLayer,
} from "../../../utilities/product";
import EntityHeader from "../../page/EntityHeader";
import DataGrid from "../../ui/DataGrid/DataGrid";
import StatusBadge from "../../ui/StatusBadge.tsx";
import { Tooltip } from "../../ui/Tooltip.tsx";
import { CustomFilter } from "./CustomFilter.tsx";
import "./Table.css";

export declare type TableProps = {
  compact?: boolean;
  dateRange: DateRange;
  enableEditing?: boolean;
  instrument?: string | null;
  mission?: string | null;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onSelectPoint: (point: DataResponseDataEntry | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  selectedPoint: DataResponseDataEntry | null;
  showHeader?: boolean;
  tableEntity: TableEntity;
};

function getAGGridFilterType(type: ProductField["type"] | string) {
  switch (type) {
    case "int":
      return "agNumberColumnFilter";
    case "float":
      return "agNumberColumnFilter";
    case "str":
      return "agTextColumnFilter";
    case "bool":
      return "agTextColumnFilter";
    case "datetime":
      return "agDateColumnFilter";
    case "dict":
      return "agTextColumnFilter";
    default:
      return true;
  }
}

const Table = memo(function Table({
  dateRange,
  showHeader = true,
  enableEditing = true,
  instrument,
  mission,
  tableEntity,
  products,
  selectedPoint,
  onSetProductPreview = () => {},
  onSelectPoint = () => {},
  onDelete = () => {},
  onDuplicate = () => {},
  onEdit = () => {},
  compact = false,
}: TableProps) {
  const [loading, setLoading] = useState(false);
  // TODO pass error to DataGrid and have it make use of an error
  const [error, setError] = useState<Error | null>();
  const [rowData, setRowData] = useState<
    Record<string, DataResponseDataEntry>[]
  >([]);
  const [clearFiltersCallback, setClearFiltersCallback] = useState<
    (() => void) | null
  >(null);

  const cancelHandles: Record<string, () => void> = {};

  const computedDateRange = useMemo(
    () =>
      tableEntity.syncWithPageDateRange ? dateRange : { start: "", end: "" },
    [tableEntity.syncWithPageDateRange, dateRange]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchTableData = useCallback(
    debounce(
      (
        layers: DataLayer[],
        startDate: string,
        endDate: string,
        mission,
        instrument
      ) => fetchTableData(layers, startDate, endDate, mission, instrument),
      100
    ),
    []
  );

  useEffect(() => {
    debouncedFetchTableData(
      tableEntity.layers,
      computedDateRange.start,
      computedDateRange.end,
      mission,
      instrument
    );
    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(tableEntity.layers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(tableEntity.columns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(computedDateRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(tableEntity.data),
    mission,
    instrument,
  ]);

  const columnDefs: DataGridColumnDef[] = buildTableColumns();

  function buildTableColumns() {
    const tmpTableColumns: DataGridColumnDef[] = [];
    const tableColumnGroups = new Map<string, ColGroupDef>();

    // Create column groups if any were defined
    tableEntity.columnGroups?.forEach((columnGroup) => {
      if (columnGroup.id === undefined) {
        return;
      }
      tableColumnGroups.set(columnGroup.id, {
        headerName: columnGroup.name,
        children: [],
      });
    });

    tableEntity.columns.map((column) => {
      const layer = tableEntity.layers.find((l) => l.id === column.layerId);
      if (!layer) {
        return {};
      }

      const pseudoLayer: DataLayer = {
        ...layer,
        fields: [column.field],
        mission: mission ?? layer.mission,
        instrument: instrument ?? layer.instrument,
      };
      const metadata = getFieldMetadataForLayer(
        column.field,
        pseudoLayer,
        products
      );
      const product = getProductForLayer(pseudoLayer, products);
      const fieldId = `${column.layerId}.${column.field}`;
      const col: DataGridColumnDef = {
        field: fieldId,
        flex: tableEntity.fitToGridWidth ? 1 : undefined,
        minWidth: 50,
        filter: getAGGridFilterType(metadata?.type || ""),
        floatingFilter: true,
        floatingFilterComponent: CustomFilter,
        headerName:
          column.label ||
          `${column.field}${metadata?.unit ? ` (${metadata?.unit})` : ""}`,
        resizable: true,
        sortable: true,
        floatingFilterComponentParams: {
          onColumnPreview: () => {
            if (product) {
              onSetProductPreview({
                product,
                field: column.field,
                dateRange,
                instrument: instrument || undefined,
              });
            }
          },
        },
        cellClass: (params) => {
          if (
            !params.data ||
            !(column.layerId in params.data) ||
            !(column.field in params.data[column.layerId]) ||
            !params.data[column.layerId][column.field] ||
            !params.data[column.layerId][column.field]._thresholds
          ) {
            return "";
          }
          const { limits, warnings }: ComputedThresholds =
            params.data[column.layerId][column.field]._thresholds;

          if (
            !limits.lower &&
            !limits.upper &&
            !warnings.lower &&
            !warnings.upper
          ) {
            return "";
          }

          if (metadata && tableEntity.applyThresholds) {
            const { limits, warnings } = applyFieldThresholds(
              metadata,
              params.data[column.layerId]
            );

            if (limits.lower || limits.upper) {
              return "limit-cell";
            }

            if (warnings.lower || warnings.upper) {
              return "warning-cell";
            }
          }
        },
        tooltipValueGetter: (params) => {
          if (
            !params.data ||
            !(column.layerId in params.data) ||
            !(column.field in params.data[column.layerId])
          ) {
            return "";
          }

          if (metadata && tableEntity.applyThresholds) {
            const { limits, warnings } = applyFieldThresholds(
              metadata,
              params.data[column.layerId]
            );

            const tooltipText =
              `Field: ${column.label} \n` +
              `Lower limit value: ${limits.lower_value ?? "-"} \n` +
              `Upper limit value: ${limits.upper_value ?? "-"} \n` +
              `Lower warning value: ${warnings.lower_value ?? "-"} \n` +
              `Upper warning value: ${warnings.upper_value ?? "-"}`;
            return tooltipText;
          }
          return params.valueFormatted;
        },
        valueFormatter: (params) => {
          if (metadata?.type === "datetime" && column.dateFormat === "short") {
            return params.value.split("T")[0];
          } else if (metadata?.type === "datetime") {
            return params.value.split("+")[0];
          }

          if (params.value === "") {
            return "-";
          }

          if (typeof params.value === "number") {
            return parseFloat(params.value.toPrecision(4));
          }

          return params.value;
        },
        valueGetter: (
          params: ValueGetterParams<Record<string, DataResponseDataEntry>>
        ) => {
          if (
            !params.data ||
            !(column.layerId in params.data) ||
            !(column.field in params.data[column.layerId])
          ) {
            return "";
          }
          const fieldData = params.data[column.layerId][column.field];
          if (typeof fieldData !== "object") {
            return fieldData;
          }
          if (Object.prototype.hasOwnProperty.call(fieldData, "value")) {
            if (typeof fieldData.value === "number") {
              return parseFloat(fieldData.value.toPrecision(4));
            }
            return fieldData.value;
          }
          if (Object.prototype.hasOwnProperty.call(fieldData, "avg")) {
            return fieldData.avg;
          }
          if (
            Object.prototype.hasOwnProperty.call(fieldData, "min") &&
            Object.prototype.hasOwnProperty.call(fieldData, "max")
          ) {
            return `${fieldData.min} – ${fieldData.max}`;
          }
        },
      };

      // If column has a group and group is defined, add it to the group's children;
      // otherwise treat it as a standalone column.
      if (column.columnGroupId && tableColumnGroups.has(column.columnGroupId)) {
        tableColumnGroups.get(column.columnGroupId)!.children!.push(col);
      } else {
        tmpTableColumns.push(col);
      }

      return col;
    });

    // Build derived column
    const shouldCollapseByDay =
      tableEntity.collapse === "same_day" && tableEntity.dateFormat === "short";

    const col: DataGridColumnDef = {
      field: "timestamp",
      floatingFilter: false,
      headerName: "Timestamp",
      minWidth: 150,
      flex: 1,
      resizable: true,
      initialSort: "desc",
      filter: "agDateColumnFilter",
      valueGetter: (
        params: ValueGetterParams<Record<string, DataResponseDataEntry>>
      ) => {
        if (!params.data) {
          return "";
        }
        return Object.values(params.data)[0].timestamp ?? "";
      },
      valueFormatter: (params) => {
        if (shouldCollapseByDay) {
          return params.value.split("T")[0];
        }
        return params.value.split("+")[0];
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cellRenderer: (params: any) => {
        if (!tableEntity.applyThresholds) {
          return <>{params.valueFormatted}</>;
        }

        let tripped: Status = "nominal";
        for (let i = 0; i < tableEntity.columns.length; i++) {
          const column = tableEntity.columns[i];

          // For each column, see if the row has tripped any thresholds
          if (
            !params.data ||
            !(column.layerId in params.data) ||
            !(column.field in params.data[column.layerId]) ||
            !params.data[column.layerId][column.field] ||
            !params.data[column.layerId][column.field]._thresholds
          ) {
            continue;
          }
          const { limits, warnings }: ComputedThresholds =
            params.data[column.layerId][column.field]._thresholds;

          if (
            !limits.lower &&
            !limits.upper &&
            !warnings.lower &&
            !warnings.upper
          ) {
            continue;
          }

          if (limits.lower || limits.upper) {
            tripped = "error";
            break;
          }

          if (warnings.lower || warnings.upper) {
            tripped = "warning";
            break;
          }
        }
        return (
          <span className="derived-column">
            <StatusBadge status={tripped} /> {params.valueFormatted}
          </span>
        );
      },
    };

    tmpTableColumns.push(col);

    // Add column groups to table column definition
    tableColumnGroups.forEach((colGroup) => {
      tmpTableColumns.push(colGroup);
    });

    return tmpTableColumns;
  }

  const fetchAllLayerData = async (
    layers: DataLayer[],
    startTime?: string,
    endTime?: string,
    mission?: string | null,
    instrument?: string | null
  ) => {
    setLoading(true);
    setError(null);
    let results: {
      layer: DataLayer;
      result: DataResponse;
    }[] = [];
    let aborted = false;
    let error = false;
    try {
      results = await Promise.all(
        layers.map((layer) =>
          fetchLayerData(layer, startTime, endTime, mission, instrument)
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

  const fetchLayerData = (
    layer: DataLayer,
    startTime: string | undefined,
    endTime: string | undefined,
    mission?: string | null,
    instrument?: string | null
  ): Promise<{ layer: DataLayer; result: DataResponse }> => {
    const layerFullId = getDataLayerId(layer);
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      const computedStartTime = startTime || layer.startTime;
      const computedEndTime = endTime || layer.endTime;

      const { json, cancel } = getData(
        mission ?? layer.mission,
        layer.dataset,
        instrument ?? layer.instrument,
        layer.version,
        layer.fields,
        layer.channels ?? [],
        computedStartTime,
        computedEndTime,
        undefined,
        layer.filter
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

  const fetchTableData = async (
    layers: DataLayer[],
    startTime?: string,
    endTime?: string,
    mission?: string | null,
    instrument?: string | null
  ) => {
    let finalResults = [];
    if (tableEntity.data) {
      finalResults = tableEntity.data;
    } else {
      const { results, error, aborted } = await fetchAllLayerData(
        layers,
        startTime,
        endTime,
        mission,
        instrument
      );

      if (error || aborted) {
        return;
      }
      finalResults = results;
    }

    const rows: Record<string, ProcessedDataResponseDataEntry>[] = [];

    finalResults.forEach(({ layer, result }) => {
      const metadataCache: Record<string, ProductField> = {};
      if (layer.fields) {
        layer.fields.forEach((field) => {
          const metadata = getFieldMetadataForLayer(
            field,
            layer as DataLayer,
            products
          );
          if (metadata) {
            metadataCache[field] = metadata;
          }
        });
      }
      result.data.forEach((result, i) => {
        const processedResult: ProcessedDataResponseDataEntry = result;
        Object.keys(result).forEach((key) => {
          // Compute thresholds for result if metadata available for the field
          if (key !== "timestamp" && metadataCache[key]) {
            const thresholds = applyFieldThresholds(metadataCache[key], result);
            processedResult[key]._thresholds = thresholds;
          }
        });
        if (!rows[i]) {
          rows[i] = { [layer.id]: processedResult };
        } else {
          rows[i] = { ...rows[i], [layer.id]: processedResult };
        }
      });
    });

    setRowData(rows);
  };

  let selectedPointId;
  let idField = "";
  const tableEntityIdField = tableEntity.idField;
  if (selectedPoint && typeof tableEntityIdField === "string") {
    let idFieldKey = "";
    const selectedRow = rowData.find((d) => {
      // Check all layers
      let found = false;
      Object.entries(d).forEach(([key, value]) => {
        if (
          value[tableEntityIdField]?.value ===
          selectedPoint[tableEntityIdField]?.value
        ) {
          found = true;
          idField = `${key}.${tableEntityIdField}`;
          idFieldKey = key;
        }
      });
      return found;
    });
    if (
      selectedRow &&
      selectedRow[idFieldKey] &&
      selectedRow[idFieldKey][tableEntityIdField]
    ) {
      selectedPointId =
        selectedRow[idFieldKey][tableEntityIdField].value?.toString();
    }
  }

  const onRowSelected = (row: Record<string, DataResponseDataEntry> | null) => {
    if (!row) {
      return;
    }

    // TODO think this through more in case of duplicated fields?
    // construct a point by merging all of the nested layer data
    const point = Object.values(row).reduce((p, value) => {
      p = { ...p, ...value };
      return p;
    }, {}) as DataResponseDataEntry;
    onSelectPoint(point);
  };

  const handleClearFilters = useCallback((clearFn: () => void) => {
    setClearFiltersCallback(() => clearFn);
  }, []);
  return (
    <div
      className={classNames("table group", {
        "table-compact": compact,
      })}
    >
      {showHeader && (
        <EntityHeader
          movable={!enableEditing}
          title={tableEntity.title}
          rightContent={
            <div className="right-content flex h-full items-center gap-0 border-r">
              <Tooltip content="Clear all filters">
                <Button
                  className="h-full w-[28px] rounded-none"
                  variant="ghost"
                  size="icon"
                  onClick={() => clearFiltersCallback?.()}
                >
                  <FilterX size={16} className="select-none" />
                </Button>
              </Tooltip>
              <div className="invisible group-hover:visible">
                <DropdownMenu>
                  <Tooltip content="More options">
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="h-full w-[28px] rounded-none"
                        variant="ghost"
                        size="icon"
                      >
                        <MoreVertical size={16} className="select-none" />
                      </Button>
                    </DropdownMenuTrigger>
                  </Tooltip>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuItem
                      onClick={() => onEdit()}
                      disabled={!enableEditing}
                    >
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDuplicate()}
                      disabled={!enableEditing}
                    >
                      <CopyPlus /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete()}
                      disabled={!enableEditing}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem>
                      <Download /> Download Data
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Camera /> Snapshot
                    </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          }
        />
      )}
      {!compact && (
        <DataGrid
          error={error}
          idKey={idField}
          fitToGridWidth={!!tableEntity.fitToGridWidth}
          compact={tableEntity.compact}
          loading={loading}
          rowData={rowData}
          columnDefs={columnDefs}
          selectedItemId={selectedPointId}
          onRowSelected={onRowSelected}
          onClearFilters={handleClearFilters}
          gridProps={{
            getRowClass: (params) => {
              let rowClass = "";
              for (let i = 0; i < tableEntity.columns.length; i++) {
                const column = tableEntity.columns[i];

                // For each column, see if the row has tripped any thresholds
                if (
                  !params.data ||
                  !(column.layerId in params.data) ||
                  !(column.field in params.data[column.layerId]) ||
                  !params.data[column.layerId][column.field] ||
                  !params.data[column.layerId][column.field]._thresholds
                ) {
                  continue;
                }
                const { limits, warnings }: ComputedThresholds =
                  params.data[column.layerId][column.field]._thresholds;

                if (
                  !limits.lower &&
                  !limits.upper &&
                  !warnings.lower &&
                  !warnings.upper
                ) {
                  continue;
                }

                if (limits.lower || limits.upper) {
                  rowClass = "limit-row";
                  break;
                }

                if (warnings.lower || warnings.upper) {
                  rowClass = "warning-row";
                  break;
                }
              }
              return rowClass;
            },
          }}
        />
      )}
    </div>
  );
},
arePropsEqual);

function arePropsEqual(oldProps: TableProps, newProps: TableProps) {
  const propsEqual =
    oldProps.compact === newProps.compact &&
    oldProps.mission === newProps.mission &&
    oldProps.instrument === newProps.instrument &&
    oldProps.dateRange.start === newProps.dateRange.start &&
    oldProps.dateRange.end === newProps.dateRange.end &&
    JSON.stringify(oldProps.selectedPoint) ===
      JSON.stringify(newProps.selectedPoint) &&
    oldProps.showHeader === newProps.showHeader &&
    JSON.stringify(oldProps.tableEntity) ===
      JSON.stringify(newProps.tableEntity);

  return propsEqual;
}

export default Table;
