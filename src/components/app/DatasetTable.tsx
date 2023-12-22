import { Dataset } from "../../types/view";
import DataGrid from "../ui/DataGrid/DataGrid";

export declare type DatasetTableProps = {
  datasets: Dataset[];
};

export const DatasetTable = ({ datasets }: DatasetTableProps) => {
  const columnDefs = [
    {
      field: "name",
      filter: "string",
      headerName: "Dataset Name",
      resizable: true,
      sortable: true,
    },
    {
      field: "mission",
      filter: "string",
      headerName: "Mission",
      resizable: true,
      sortable: true,
    },
    {
      field: "id",
      filter: "string",
      headerName: "ID",
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 200,
    },
  ];
  return <DataGrid<Dataset> rowData={datasets} columnDefs={columnDefs} />;
};

export default Map;
