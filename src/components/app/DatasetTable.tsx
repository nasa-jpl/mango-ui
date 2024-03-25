import {
  DatasetField,
  DatasetResolution,
  DatasetStream,
} from "../../types/api";
import { DataGridColumnDef } from "../../types/data-grid";
import DataGrid from "../ui/DataGrid/DataGrid";

export declare type DatasetTableProps = {
  datasets: DatasetStream[];
  loading?: boolean;
};

export const DatasetTable = ({ datasets, loading }: DatasetTableProps) => {
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
      field: "available_resolutions",
      filter: "string",
      headerName: "Resolutions",
      resizable: true,
      sortable: true,
      minWidth: 300,
      valueFormatter: ({ value: resolutions }) =>
        resolutions.map((r: DatasetResolution) => r.downsampling_factor),
    },
    // {
    //   field: "data_begin",
    //   filter: "string",
    //   headerName: "Data Start",
    //   resizable: true,
    //   sortable: true,
    //   minWidth: 180,
    //   valueFormatter: ({ value: dataEnd }) => new Date(dataEnd).toISOString(),
    // },
    // {
    //   field: "data_end",
    //   filter: "string",
    //   headerName: "Data End",
    //   resizable: true,
    //   sortable: true,
    //   minWidth: 180,
    //   valueFormatter: ({ value: dataEnd }) => new Date(dataEnd).toISOString(),
    // },
    {
      field: "available_fields",
      filter: "string",
      headerName: "Fields",
      resizable: true,
      flex: 1,
      valueGetter: (params) =>
        params.data.available_fields.map((f: DatasetField) => f.name),
    },
  ];
  return (
    <DataGrid<DatasetStream>
      rowData={datasets}
      columnDefs={columnDefs}
      loading={loading}
    />
  );
};

export default Map;
