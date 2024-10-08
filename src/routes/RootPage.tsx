import { useEffect, useMemo, useState } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import ProductPreviewModal from "../components/app/ProductPreviewModal";
import Sidebar from "../components/app/Sidebar/Sidebar";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { View } from "../types/view";
import { getMissions, getProducts, getView } from "../utilities/api";

export default function RootPage() {
  const { view: initialView } = useLoaderData() as Record<"view", View>;
  const [view, setView] = useState<View>(initialView);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [productPreview, setProductPreview] = useState<ProductPreview>({
    product: undefined,
  });

  useEffect(() => {
    const initialize = () => {
      const abortController = new AbortController();
      const fetchData = async () => {
        try {
          await Promise.all([
            fetchView(abortController.signal),
            fetchProducts(abortController.signal),
          ]);
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Error loading initial data", err);
          }
        }
      };
      fetchData();
      return () => abortController.abort();
    };
    const abort = initialize();
    return abort;
  }, []);

  const fetchView = async (signal: AbortSignal) => {
    const view = await getView(signal);
    setView(view);
  };

  const fetchProducts = async (signal: AbortSignal) => {
    const missions = await getMissions(signal);
    const products = await Promise.all(
      missions.map((mission) => getProducts(mission, signal))
    );
    setProducts(products.flat());
    setLoadingInitialData(false);
  };

  const context = useMemo(
    () => [view, setView, products, setProductPreview, loadingInitialData],
    [view, setView, products, setProductPreview, loadingInitialData]
  );

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar view={view} title={import.meta.env.VITE_APP_TITLE} />
      <Outlet context={context} />
      {!loadingInitialData && (
        <ProductPreviewModal
          onClose={() => setProductPreview({ product: undefined })}
          products={products}
          {...productPreview}
        />
      )}
    </div>
  );
}
