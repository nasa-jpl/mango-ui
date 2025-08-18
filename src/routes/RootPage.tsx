import { debounce, isEqual } from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import { toast } from "sonner";
import ProductPreviewModal from "../components/app/ProductPreviewModal";
import Sidebar from "../components/app/Sidebar/Sidebar";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { View } from "../types/view";
import { getMissions, getProducts } from "../utilities/api";

export default function RootPage() {
  const { view: _initialView } = useLoaderData() as Record<"view", View>;
  const [initialView, setInitialView] = useState<View>(_initialView);
  const [view, setView] = useState<View>(_initialView);
  const [viewChanged, setViewChanged] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [productPreview, setProductPreview] = useState<ProductPreview>({
    product: undefined,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedDetectViewChanges = useCallback(
    debounce((view, initialView) => detectViewChanges(view, initialView), 500, {
      leading: true,
      trailing: true,
    }),
    []
  );

  useEffect(() => {
    debouncedDetectViewChanges(view, initialView);
  }, [view, initialView, debouncedDetectViewChanges]);

  useEffect(() => {
    const initialize = () => {
      const abortController = new AbortController();
      const fetchData = async () => {
        try {
          await fetchProducts(abortController.signal);
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Error loading products", err);
            toast.error("Unable to load products", {
              duration: 999999999,
              richColors: true,
            });
          }
        }
      };
      fetchData();
      return () => abortController.abort();
    };
    const abort = initialize();
    return abort;
  }, []);

  const detectViewChanges = (view: View, initialView: View) => {
    const changed = !isEqual(view, initialView);
    setViewChanged(changed);
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
    () => [
      view,
      setView,
      products,
      setProductPreview,
      loadingInitialData,
      initialView,
    ],
    [
      view,
      setView,
      products,
      setProductPreview,
      loadingInitialData,
      initialView,
    ]
  );

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar
        view={view}
        viewSavingEnabled={viewChanged}
        onViewSaved={(view) => setInitialView(view)}
        title={import.meta.env.VITE_APP_TITLE}
      />
      <Outlet context={context} />
      {!loadingInitialData && (
        <ProductPreviewModal
          dateBounds={view.config?.dateRangeBounds}
          onClose={() => setProductPreview({ product: undefined })}
          products={products}
          {...productPreview}
        />
      )}
    </div>
  );
}
