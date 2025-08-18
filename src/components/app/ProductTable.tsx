import { Button } from "@nasa-jpl/stellar-react";
import { ChartLine } from "lucide-react";
import { Product, ProductField, ProductResolution } from "../../types/api";
import { DataGridColumnDef } from "../../types/data-grid";
import { ProductPreview } from "../../types/page";
import DataGrid from "../ui/DataGrid/DataGrid";
import { Tooltip } from "../ui/Tooltip";

export declare type ProductTableProps = {
  loading?: boolean;
  onSetProductPreview: (previewProduct: ProductPreview) => void;
  products: Product[];
};

export const ProductTable = ({
  products,
  loading,
  onSetProductPreview,
}: ProductTableProps) => {
  console.log("products :>> ", products);

  // Create a row per product dataset
  const productEntries: Product[] = products
    .map((product) => {
      return product.datasets
        .map((dataset) => {
          return {
            ...product,
            datasets: [dataset],
            instruments: [dataset.instrument_id],
          };
        })
        .flat();
    })
    .flat();
  const columnDefs: DataGridColumnDef<Product>[] = [
    {
      field: "id",
      headerName: "",
      width: 50,
      cellRenderer: (params: { data: Product | undefined }) => {
        const { data } = params;
        if (data === undefined) return;
        return (
          <div className="flex items-center h-[inherit] min-h-[30px] product-preview-button">
            <Tooltip content="Preview">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onSetProductPreview({ product: data })}
                aria-label="Open product preview"
              >
                <ChartLine size={24} />
              </Button>
            </Tooltip>
          </div>
        );
      },
    },
    {
      field: "id",
      filter: "string",
      headerName: "Name",
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
      field: "instruments",
      filter: "string",
      headerName: "Spacecraft",
      resizable: true,
      sortable: true,
      width: 110,
    },
    {
      filter: "string",
      headerName: "Data Start",
      resizable: true,
      sortable: true,
      minWidth: 180,
      valueFormatter: ({ value: dataEnd }) =>
        dataEnd ? new Date(dataEnd).toISOString() : "–",
      valueGetter: (params) => params.data?.datasets[0].data_begin,
    },
    {
      filter: "string",
      headerName: "Data End",
      resizable: true,
      sortable: true,
      minWidth: 180,
      valueFormatter: ({ value: dataEnd }) =>
        dataEnd ? new Date(dataEnd).toISOString() : "–",
      valueGetter: (params) => params.data?.datasets[0].data_end,
    },
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
      autoHeight: true,
      valueGetter: (params) =>
        params.data?.available_fields.map((f: ProductField) => f.name),
    },
    {
      field: "available_resolutions",
      filter: "string",
      headerName: "Resolutions",
      width: 200,
      resizable: true,
      sortable: true,
      autoHeight: true,
      valueFormatter: ({ value: resolutions }) =>
        resolutions.map((r: ProductResolution) => r.downsampling_factor),
    },
  ];
  return (
    <DataGrid<Product>
      rowData={productEntries}
      columnDefs={columnDefs}
      loading={loading}
      className="[&_div[role='row']:not(:hover)_.product-preview-button]:opacity-0 [&_div[role='row']:not(:hover)_.product-preview-button]:pointer-events-none"
    />
  );
};

export default ProductTable;
