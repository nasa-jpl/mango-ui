import { useLoaderData } from "react-router-dom";
import { DatasetTable } from "../components/app/DatasetTable";
import Page from "../components/ui/Page";
import { Dataset } from "../types/view";

export default function DatasetsPage() {
  const { datasets } = useLoaderData() as { datasets: Dataset[] };

  return (
    <Page title="Datasets" padBody>
      <DatasetTable datasets={datasets} />
    </Page>
  );
}
