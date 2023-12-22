import { TableEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import DataGrid from "../../ui/DataGrid/DataGrid";
// import "./Table.css";

export declare type TableProps = {
  tableEntity: TableEntity;
};

export const Table = ({ tableEntity }: TableProps) => {
  return (
    <div className="table">
      <EntityHeader title={tableEntity.title} />
      <DataGrid rowData={[]} columnDefs={[]} />
    </div>
  );
};

export default Table;
