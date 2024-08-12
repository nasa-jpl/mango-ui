import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import { AgGridReact } from "ag-grid-react"; // React Grid Logic
import { useEffect, useMemo, useRef } from "react";
import { DataGridColumnDef } from "../../../types/data-grid";
import CustomHeader from "../../entities/table/CustomHeader";
import "./ag-grid-stellar.css";

export declare type DataGridProps<T> = {
  className?: string;
  columnDefs: DataGridColumnDef[];
  loading?: boolean;
  rowData: T[];
};

export function DataGrid<T>({
  columnDefs,
  rowData,
  loading,
  className = "",
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact>(null);
  useEffect(() => {
    if (!gridRef.current || !gridRef.current.api) {
      return;
    }
    if (loading) {
      gridRef.current.api.showLoadingOverlay();
    } else {
      gridRef.current.api.hideOverlay();
    }
  }, [loading, gridRef.current?.api]);

  const components = useMemo<{
    [p: string]: unknown;
  }>(() => {
    return {
      agColumnHeader: CustomHeader,
    };
  }, []);

  return (
    <div className="ag-theme-stellar" style={{ height: "100%", width: "100%" }}>
      <AgGridReact<T>
        ref={gridRef}
        className={className}
        rowData={rowData}
        components={components}
        columnDefs={columnDefs}
        animateRows={false}
        suppressCellFocus
        suppressDragLeaveHidesColumns
        suppressRowClickSelection
        /* TODO style this */
        overlayLoadingTemplate='<div aria-live="polite" aria-atomic="true" style="position:absolute;top:0;left:0;right:0; bottom:0; background: url(https://ag-grid.com/images/ag-grid-loading-spinner.svg) center no-repeat" aria-label="loading"></div>'
      />
    </div>
  );
}

export default DataGrid;
