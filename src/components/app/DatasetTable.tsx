import { DataGridColumnDef } from "../../types/data-grid";
import { DatasetStream } from "../../types/view";
import DataGrid from "../ui/DataGrid/DataGrid";

export declare type DatasetTableProps = {
  datasets: DatasetStream[];
};

export const DatasetTable = ({ datasets }: DatasetTableProps) => {
  const columnDefs: DataGridColumnDef[] = [
    {
      field: "id",
      filter: "string",
      headerName: "Dataset Name",
      resizable: true,
      sortable: true,
      width: 130,
    },
    {
      field: "mission",
      filter: "string",
      headerName: "Mission",
      resizable: true,
      sortable: true,
      width: 90,
    },
    {
      field: "streamId",
      filter: "string",
      headerName: "Spacecraft",
      resizable: true,
      sortable: true,
      width: 110,
    },
    {
      field: "data_begin",
      filter: "string",
      headerName: "Data Start",
      resizable: true,
      sortable: true,
      minWidth: 180,
      valueFormatter: ({ value: dataEnd }) => new Date(dataEnd).toISOString(),
    },
    {
      field: "data_end",
      filter: "string",
      headerName: "Data End",
      resizable: true,
      sortable: true,
      minWidth: 180,
      valueFormatter: ({ value: dataEnd }) => new Date(dataEnd).toISOString(),
    },
    {
      field: "available_fields",
      filter: "string",
      headerName: "Fields",
      resizable: true,
      flex: 1,
    },
  ];
  return <DataGrid<DatasetStream> rowData={datasets} columnDefs={columnDefs} />;
};

export default Map;
