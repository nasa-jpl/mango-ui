import { useOutletContext, useParams } from "react-router-dom";
import Page from "../components/page/ViewPage";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { View, Page as ViewPageType } from "../types/view";

export default function ViewPage() {
  const [
    view,
    setView,
    products,
    setProductPreview,
    missions,
    loadingInitialData,
  ] =
    useOutletContext<
      [
        View,
        React.Dispatch<React.SetStateAction<View>>,
        Product[],
        React.Dispatch<React.SetStateAction<ProductPreview>>,
        { id: string; label: string }[],
        boolean
      ]
    >();

  const { pageGroupURL, pageURL } = useParams();
  const pageGroup = view.pageGroups.find(
    (pageGroup) => pageGroup.url === pageGroupURL
  );
  if (!pageGroup) {
    return (
      <div className="w-full h-full items-center justify-center flex font-medium text-red-500">
        Page group not found
      </div>
    );
  }
  const page = pageGroup.pages.find((p) => p.url === pageURL);
  if (!page) {
    return (
      <div className="w-full h-full items-center justify-center flex font-medium text-red-500">
        Page not found
      </div>
    );
  }
  return (
    <Page
      products={products}
      loadingInitialData={loadingInitialData}
      missions={missions}
      viewPage={page}
      dateBounds={view.config?.dateRangeBounds}
      onSetProductPreview={setProductPreview}
      onPageChange={(page: ViewPageType) => {
        const newView = {
          ...view,
          pageGroups: view.pageGroups.map((pg) => {
            if (pg.id === pageGroup.id) {
              return {
                ...pg,
                pages: pg.pages.map((p) => {
                  if (p.id === page.id) {
                    return page;
                  }
                  return p;
                }),
              };
            }
            return pg;
          }),
        };
        setView(newView);
      }}
    />
  );
}
