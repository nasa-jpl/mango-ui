import { useOutletContext } from "react-router-dom";
import { DatasetTable } from "../components/app/DatasetTable";
import Page from "../components/ui/Page";
import { Dataset, DatasetStream, View } from "../types/view";

export default function DatasetsPage() {
  // const { datasets } = useLoaderData() as { datasets: Dataset[] };
  const [, , datasets] = useOutletContext<[View, never, Dataset[]]>();

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

  return (
    <Page title="Datasets" padBody>
      <DatasetTable datasets={datasetEntries} />
    </Page>
  );
}
