import {
  SizeColumnsToContentStrategy,
  SizeColumnsToFitGridStrategy,
  SizeColumnsToFitProvidedWidthStrategy,
} from "@ag-grid-community/core";
import { IRowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import { AgGridReact, AgGridReactProps } from "ag-grid-react"; // React Grid Logic
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataGridColumnDef } from "../../../types/data-grid";
import "./ag-grid-stellar.css";

export declare type DataGridProps<T> = {
  className?: string;
  columnDefs: DataGridColumnDef[];
  compact?: boolean;
  fitToGridWidth?: boolean;
  gridProps?: AgGridReactProps;
  idKey?: keyof T | undefined;
  loading?: boolean;
  onRowSelected?: (row: T | null) => void;
  rowData: T[];
  selectedItemId?: string | undefined;
};

export function DataGrid<T>({
  columnDefs,
  rowData,
  selectedItemId,
  onRowSelected = () => {},
  idKey,
  compact = false,
  fitToGridWidth = false,
  loading = true,
  className = "",
  gridProps = {},
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact>(null);
  const [gridReady, setGridReady] = useState(false);

  useEffect(() => {
    if (gridRef.current && gridRef.current.api && gridReady) {
      if (!selectedItemId || !idKey) {
        gridRef.current.api.deselectAll();
      } else {
        // Find the currently selected node
        gridRef.current.api.forEachNodeAfterFilterAndSort(
          (rowNode: IRowNode<T>) => {
            if (rowNode.data && gridRef.current?.api) {
              const value = gridRef.current.api.getCellValue({
                rowNode,
                colKey: idKey.toString(),
              });
              if (value === selectedItemId) {
                if (!rowNode.isSelected()) {
                  rowNode.setSelected(true);
                  if (rowNode.rowIndex !== null) {
                    gridRef.current.api.ensureIndexVisible(rowNode.rowIndex);
                  }
                }
              } else {
                if (rowNode.isSelected()) {
                  rowNode.setSelected(false);
                }
              }
            }
          }
        );
      }
    }
  }, [selectedItemId, idKey, gridReady]);

  const autoSizeStrategy = useMemo<
    | SizeColumnsToFitGridStrategy
    | SizeColumnsToFitProvidedWidthStrategy
    | SizeColumnsToContentStrategy
  >(() => {
    return {
      type: fitToGridWidth ? "fitGridWidth" : "fitCellContents",
    };
  }, [fitToGridWidth]);

  return (
    <div
      className={classNames("ag-theme-stellar", {
        "ag-theme-stellar--compact": compact,
      })}
      style={{ height: "100%", width: "100%" }}
    >
      <AgGridReact<T>
        ref={gridRef}
        suppressColumnVirtualisation
        headerHeight={32}
        className={className}
        rowData={rowData}
        rowSelection={{
          checkboxes: false,
          enableClickSelection: true,
          mode: "singleRow",
        }}
        loading={loading}
        columnDefs={columnDefs}
        enableBrowserTooltips={true}
        animateRows={false}
        suppressCellFocus
        autoSizeStrategy={autoSizeStrategy}
        onGridReady={() => setGridReady(true)}
        enableCellTextSelection
        suppressDragLeaveHidesColumns
        /* TODO style this and don't load it from url */
        overlayLoadingTemplate='<div aria-live="polite" aria-atomic="true" style="position:absolute;top:0;left:0;right:0; bottom:0; background: url(https://ag-grid.com/images/ag-grid-loading-spinner.svg) center no-repeat" aria-label="loading"></div>'
        onSelectionChanged={() => {
          const selectedNodes = gridRef.current?.api?.getSelectedNodes() ?? [];
          onRowSelected(selectedNodes[0]?.data ?? null);
        }}
        {...gridProps}
      />
    </div>
  );
}

export default DataGrid;
