import type { ValueGetterParams } from "ag-grid-community";
import { useEffect, useMemo, useState } from "react";
import {
  DataResponse,
  DataResponseDataEntry,
  Product,
} from "../../../types/api";
import { DataGridColumnDef } from "../../../types/data-grid";
import { ProductPreview } from "../../../types/page.ts";
import { DateRange } from "../../../types/time";
import { TableEntity, TableLayer } from "../../../types/view";
import { getData } from "../../../utilities/api";
import { getTableLayerId, isAbortError } from "../../../utilities/generic";
import {
  getFieldMetadataForLayer,
  getProductForLayer,
} from "../../../utilities/product";
import EntityHeader from "../../page/EntityHeader";
import DataGrid from "../../ui/DataGrid/DataGrid";
import "./Table.css";

export declare type TableProps = {
  dateRange: DateRange;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
  showHeader?: boolean;
  tableEntity: TableEntity;
};

export function Table({
  dateRange,
  showHeader = true,
  tableEntity,
  products,
  onSetProductPreview = () => {},
}: TableProps) {
  const [loading, setLoading] = useState(true);
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
      computedDateRange.end
    );
    // Use JSON.stringify for deep comparison (recommended)
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(tableEntity.layers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(computedDateRange),
  ]);

  const columnDefs: DataGridColumnDef[] = tableEntity.columns.map((column) => {
    const layer = tableEntity.layers.find((l) => l.id === column.layerId);
    if (!layer) {
      return {};
    }
    const pseudoLayer = { ...layer, field: column.field };
    const metadata = getFieldMetadataForLayer(pseudoLayer, products);
    const product = getProductForLayer(pseudoLayer, products);
    const fieldId = `${column.layerId}.${column.field}`;
    const col: DataGridColumnDef = {
      field: fieldId,
      filter: "string",
      headerName: column.field,
      resizable: true,
      sortable: true,
      headerComponentParams: {
        onColumnPreview: () => {
          if (product) {
            onSetProductPreview({ product, field: column.field, dateRange });
          }
        },
      },
      valueFormatter: (params) => {
        if (metadata?.type === "datetime") {
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
          return "Unk";
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
    return col;
  });

  const fetchAllLayerData = async (
    layers: TableLayer[],
    startTime?: string,
    endTime?: string
  ) => {
    setLoading(true);
    // setError(null);
    let results: {
      layer: TableLayer;
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
    layer: TableLayer,
    startTime: string | undefined,
    endTime: string | undefined
  ): Promise<{ layer: TableLayer; result: DataResponse }> => {
    const layerFullId = getTableLayerId(layer);
    if (cancelHandles[layerFullId]) {
      cancelHandles[layerFullId]();
    }
    return new Promise((resolve, reject) => {
      const computedStartTime = startTime || layer.startTime;
      const computedEndTime = endTime || layer.endTime;

      const { json, cancel } = getData(
        layer.mission,
        layer.dataset,
        layer.instrument,
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
    layers: TableLayer[],
    startTime?: string,
    endTime?: string
  ) => {
    const { results, error, aborted } = await fetchAllLayerData(
      layers,
      startTime,
      endTime
    );

    if (error || aborted) {
      return;
    }
    const rows: Record<string, DataResponseDataEntry>[] = [];
    results.forEach(({ layer, result }) => {
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

  return (
    <div className="table">
      {showHeader && <EntityHeader title={tableEntity.title} />}
      <DataGrid loading={loading} rowData={rowData} columnDefs={columnDefs} />
    </div>
  );
}

export default Table;
