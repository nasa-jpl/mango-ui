import { useLoaderData } from "react-router-dom";

export default function DatasetsPage() {
  const { datasets } = useLoaderData();
  return <div>Datasets: {datasets}</div>;
}
