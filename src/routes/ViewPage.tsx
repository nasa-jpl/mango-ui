import { useOutletContext, useParams } from "react-router-dom";
import Page from "../components/page/ViewPage";
import { Product } from "../types/api";
import { View, Page as ViewPageType } from "../types/view";

export default function ViewPage() {
  const [view, setView, products, loadingInitialData] =
    useOutletContext<
      [View, React.Dispatch<React.SetStateAction<View>>, Product[], boolean]
    >();

  const { pageGroupURL, pageURL } = useParams();
  const pageGroup = view.pageGroups.find(
    (pageGroup) => pageGroup.url === pageGroupURL
  );
  if (!pageGroup) {
    return <div>Error no page group</div>;
  }
  const page = pageGroup.pages.find((p) => p.url === pageURL);
  if (!page) {
    return <div>Error no page</div>;
  }
  return (
    <Page
      products={products}
      loadingInitialData={loadingInitialData}
      viewPage={page}
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
