import { Button } from "@nasa-jpl/react-stellar";
import { SectionEntity, ViewPage as ViewPageType } from "../../types/view";
import Page from "../ui/Page";
import Entity from "./Entity";
import "./ViewPage.css";

export declare type PageProps = {
  viewPage?: ViewPageType;
  onPageChange: (page: ViewPageType) => void;
};

export const ViewPage = ({ viewPage, onPageChange }: PageProps) => {
  if (!viewPage) {
    return;
  }
  return (
    <Page
      title={viewPage.title}
      pageHeaderChildren={
        <Button
          onClick={() => {
            const newViewPage: ViewPageType = {
              ...viewPage,
              entities: [
                ...viewPage.entities,
                {
                  title: "New Entity",
                  id: Math.random().toString(),
                  type: "section",
                  entities: [],
                } as SectionEntity,
              ],
            };
            onPageChange(newViewPage);
          }}
        >
          Add section
        </Button>
      }
    >
      {viewPage.entities.map((entity) => (
        <Entity entity={entity} key={entity.id} />
      ))}
    </Page>
  );
};

export default ViewPage;
