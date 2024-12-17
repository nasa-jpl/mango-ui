import type { ColGroupDef, ValueGetterParams } from "ag-grid-community";
import classNames from "classnames";
import { memo, useEffect, useMemo, useState } from "react";
import {
  DataResponse,
  DataResponseDataEntry,
  Product,
} from "../../../types/api";
import { DataGridColumnDef } from "../../../types/data-grid";
import { ProductPreview } from "../../../types/page.ts";
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
import "./Table.css";

export declare type TableProps = {
  compact?: boolean;
  dateRange: DateRange;
  instrument?: string | null;
  mission?: string | null;
  onSelectPoint: (point: DataResponseDataEntry | null) => void;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  selectedPoint: DataResponseDataEntry | null;
  showHeader?: boolean;
  tableEntity: TableEntity;
};

const Table = memo(function Table({
  dateRange,
  showHeader = true,
  instrument,
  mission,
  tableEntity,
  products,
  selectedPoint,
  onSetProductPreview = () => {},
  onSelectPoint = () => {},
  compact = false,
}: TableProps) {
  const [loading, setLoading] = useState(false);
  // TODO pass error to DataGrid and have it make use of an error
  // const [error, setError] = useState<Error | null>();
  const [rowData, setRowData] = useState<
    Record<string, DataResponseDataEntry>[]
  >([]);

  const cancelHandles: Record<string, () => void> = {};

  const computedDateRange = useMemo(
    () =>
      tableEntity.syncWithPageDateRange ? dateRange : { start: "", end: "" },
    [tableEntity.syncWithPageDateRange, dateRange]
  );

  useEffect(() => {
    fetchTableData(
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
        filter: "string",
        headerName: column.label ?? column.field,
        resizable: true,
        sortable: true,
        headerComponentParams: {
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
            !(column.field in params.data[column.layerId])
          ) {
            return "";
          }

          if (metadata) {
            const { limits, warnings } = applyFieldThresholds(
              metadata,
              params.data[column.layerId]
            );

            if (!limits.lower && !limits.upper) {
              return "";
            }

            if (!warnings.lower && !warnings.upper) {
              return "";
            }

            if (limits.lower || limits.upper) {
              return "limit-cell";
            }

            if (warnings.lower || warnings.upper) {
              return "warning-cell";
            }
          }
        },
        valueFormatter: (params) => {
          if (metadata?.type === "datetime" && column.dateFormat === "short") {
            return params.value.split("T")[0];
          } else if (metadata?.type === "datetime") {
            return params.value.split("+")[0];
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
    // setError(null);
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
        // setError(err as Error);
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
        computedStartTime,
        computedEndTime
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
    const rows: Record<string, DataResponseDataEntry>[] = [];
    finalResults.forEach(({ layer, result }) => {
      result.data.forEach((result, i) => {
        if (!rows[i]) {
          rows[i] = { [layer.id]: result };
        } else {
          rows[i] = { ...rows[i], [layer.id]: result };
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

  return (
    <div className={classNames("table", { "table-compact": compact })}>
      {showHeader && <EntityHeader title={tableEntity.title} />}
      {!compact && (
        <DataGrid
          idKey={idField}
          loading={loading}
          rowData={rowData}
          columnDefs={columnDefs}
          selectedItemId={selectedPointId}
          onRowSelected={onRowSelected}
        />
      )}
      {/* {compact && (
        <div className="st-typography-label">Click to expand</div>
      )} */}
    </div>
  );
},
arePropsEqual);

function arePropsEqual(oldProps: TableProps, newProps: TableProps) {
  const propsEqual =
    oldProps.compact === newProps.compact &&
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
