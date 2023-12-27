import { TableEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import DataGrid from "../../ui/DataGrid/DataGrid";
import "./Table.css";

export declare type TableProps = {
  tableEntity: TableEntity;
};

export const Table = ({ tableEntity }: TableProps) => {
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
      <DataGrid rowData={tableEntity.datasets || []} columnDefs={columnDefs} />
    </div>
  );
};

export default Table;
