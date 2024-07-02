import { useOutletContext } from "react-router-dom";
import { ProductTable } from "../components/app/ProductTable";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { View } from "../types/view";

export default function ProductsPage() {
  const [, , products, loadingInitialData] =
    useOutletContext<[View, never, Product[], boolean]>();

  return (
    <Page title="Products" padBody>
      <ProductTable products={products} loading={loadingInitialData} />
    </Page>
  );
}
