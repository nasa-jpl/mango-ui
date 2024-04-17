import {
  Dataset,
  DatasetField,
  DatasetResolution,
  DatasetStream,
} from "../../types/api";
import { DataGridColumnDef } from "../../types/data-grid";
import DataGrid from "../ui/DataGrid/DataGrid";
import { DatasetPreviewModal } from "./DatasetStreamPreviewModal";
import "./DatasetTable.css";

export declare type DatasetTableProps = {
  datasets: Dataset[];
  loading?: boolean;
};

export const DatasetTable = ({ datasets, loading }: DatasetTableProps) => {
  // Create a dataset row per stream
  const datasetEntries: DatasetStream[] = datasets
    .map((dataset) => {
      return dataset.streams
        .map((stream) => {
          return {
            ...dataset,
            streamId: stream.id,
            data_begin: stream.data_begin,
            data_end: stream.data_end,
          };
        })
        .flat();
    })
    .flat();

  const columnDefs: DataGridColumnDef<DatasetStream>[] = [
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
      width: 200,
      resizable: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
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
      field: "available_versions",
      filter: "string",
      headerName: "Versions",
      resizable: true,
      width: 100,
    },
    {
      field: "available_fields",
      filter: "string",
      headerName: "Fields",
      resizable: true,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      valueGetter: (params) =>
        params.data?.available_fields.map((f: DatasetField) => f.name),
    },
    {
      field: "id",
      headerName: "",
      width: 50,
      cellRenderer: (params: { data: DatasetStream | undefined }) => {
        if (!params.data) return;
        return (
          <DatasetPreviewModal
            datasetStream={params.data}
            datasets={datasets}
          />
        );
      },
    },
  ];
  return (
    <DataGrid<DatasetStream>
      rowData={datasetEntries}
      columnDefs={columnDefs}
      loading={loading}
      className="dataset-table"
    />
  );
};

export default Map;
