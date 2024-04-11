import { useOutletContext } from "react-router-dom";
import { DatasetTable } from "../components/app/DatasetTable";
import Page from "../components/ui/Page";
import { Dataset } from "../types/api";
import { View } from "../types/view";

export default function DatasetsPage() {
  // const { datasets } = useLoaderData() as { datasets: Dataset[] };
  const [, , datasets, loadingInitialData] =
    useOutletContext<[View, never, Dataset[], boolean]>();

  return (
    <Page title="Datasets" padBody>
      <DatasetTable datasets={datasets} loading={loadingInitialData} />
    </Page>
  );
}
