import { useOutletContext } from "react-router-dom";
import ViewPage from "../components/page/ViewPage";
import { Dataset } from "../types/api";
import { View } from "../types/view";

export default function HomePage() {
  const [view, , datasets, loadingInitialData] =
    useOutletContext<[View, never, Dataset[], boolean]>();
  return (
    <ViewPage
      datasets={datasets}
      loadingInitialData={loadingInitialData}
      viewPage={view.home}
      onPageChange={() => {}}
    />
  );
}
