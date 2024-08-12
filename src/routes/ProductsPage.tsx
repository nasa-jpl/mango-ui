import { useOutletContext } from "react-router-dom";
import { ProductTable } from "../components/app/ProductTable";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { View } from "../types/view";

export default function ProductsPage() {
  // TODO type outlet context instead of duplicating
  const [, , products, setProductPreview, loadingInitialData] =
    useOutletContext<
      [
        View,
        never,
        Product[],
        React.Dispatch<React.SetStateAction<ProductPreview>>,
        boolean
      ]
    >();

  return (
    <Page title="Products" padBody>
      <ProductTable
        products={products}
        loading={loadingInitialData}
        onSetProductPreview={setProductPreview}
      />
    </Page>
  );
}
