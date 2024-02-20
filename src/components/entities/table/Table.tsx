import { DateRange } from "../../../types/time";
import { TableEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import DataGrid from "../../ui/DataGrid/DataGrid";
import "./Table.css";

export declare type TableProps<T> = {
  tableEntity: TableEntity<T>;
  pageDateRange: DateRange;
};

export function Table<T>({ tableEntity, pageDateRange }: TableProps<T>) {
  const columnDefs = tableEntity.fields.map((field) => ({
    field,
    filter: "string",
    headerName: field,
    resizable: true,
    sortable: true,
  }));
  return (
    <div className="table">
      <EntityHeader title={tableEntity.title} />
      <DataGrid rowData={tableEntity.rows || []} columnDefs={columnDefs} />
    </div>
  );
}

export default Table;
