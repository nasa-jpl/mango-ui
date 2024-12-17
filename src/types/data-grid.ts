import type { ColDef, ColGroupDef } from "ag-grid-community";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataGridColumnDef<TRowData = any> =
  | ColDef<TRowData>
  | ColGroupDef<TRowData>;

export interface DataGridRowSelection<TRowData> {
  data: TRowData;
  isSelected: boolean;
}

export type DataGridRowsSelection<TRowData> = TRowData[];

export type RowId = number | string;

export interface TRowData {
  id?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
