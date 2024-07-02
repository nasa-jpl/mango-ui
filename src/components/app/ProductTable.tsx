import { Product, ProductField, ProductResolution } from "../../types/api";
import { DataGridColumnDef } from "../../types/data-grid";
import DataGrid from "../ui/DataGrid/DataGrid";
import ProductPreviewModal from "./ProductPreviewModal";
import "./ProductTable.css";

export declare type ProductTableProps = {
  loading?: boolean;
  products: Product[];
};

export const ProductTable = ({ products, loading }: ProductTableProps) => {
  console.log("products :>> ", products);
  // return <div>TODO</div>;
  // Create a row per product dataset
  const productEntries: Product[] = products
    .map((product) => {
      return product.datasets
        .map((dataset) => {
          return {
            ...product,
            datasets: [dataset],
            instruments: [dataset.instrument],
          };
        })
        .flat();
    })
    .flat();
  const columnDefs: DataGridColumnDef<Product>[] = [
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
      field: "available_resolutions",
      filter: "string",
      headerName: "Resolutions",
      width: 200,
      resizable: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      valueFormatter: ({ value: resolutions }) =>
        resolutions.map((r: ProductResolution) => r.downsampling_factor),
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
      wrapText: true,
      autoHeight: true,
      valueGetter: (params) =>
        params.data?.available_fields.map((f: ProductField) => f.name),
    },
    {
      field: "id",
      headerName: "",
      width: 50,
      cellRenderer: (params: { data: Product | undefined }) => {
        if (!params.data) return;
        return (
          <ProductPreviewModal product={params.data} products={products} />
        );
      },
    },
  ];
  return (
    <DataGrid<Product>
      rowData={productEntries}
      columnDefs={columnDefs}
      loading={loading}
      className="product-table"
    />
  );
};

export default ProductTable;
