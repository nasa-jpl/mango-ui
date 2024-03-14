import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import { AgGridReact } from "ag-grid-react"; // React Grid Logic
import { DataGridColumnDef } from "../../../types/data-grid";
import "./ag-grid-stellar.css";

export declare type DataGridProps<T> = {
  columnDefs: DataGridColumnDef[];
  rowData: T[];
};

export function DataGrid<T>({ columnDefs, rowData }: DataGridProps<T>) {
  return (
    <div className="ag-theme-stellar" style={{ height: "100%", width: "100%" }}>
      <AgGridReact<T>
        rowData={rowData}
        columnDefs={columnDefs}
        animateRows={false}
        suppressCellFocus
        suppressDragLeaveHidesColumns
        suppressRowClickSelection
      />
    </div>
  );
}

export default DataGrid;
