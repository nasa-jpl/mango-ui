import { useOutletContext } from "react-router-dom";
import ViewPage from "../components/page/ViewPage";
import { Product } from "../types/api";
import { View } from "../types/view";

export default function HomePage() {
  const [view, , products, , loadingInitialData] =
    useOutletContext<[View, never, Product[], never, boolean]>();
  return (
    <ViewPage
      products={products}
      loadingInitialData={loadingInitialData}
      viewPage={view.home}
      onPageChange={() => {}}
      onSetProductPreview={() => {}}
    />
  );
}
