import { useOutletContext, useParams } from "react-router-dom";
import Page from "../components/page/ViewPage";
import { View, Page as ViewPageType } from "../types/view";

export default function ViewPage() {
  // TODO consider a reducer for this instead of context?
  const [view, setView] =
    useOutletContext<[View, React.Dispatch<React.SetStateAction<View>>]>();

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
