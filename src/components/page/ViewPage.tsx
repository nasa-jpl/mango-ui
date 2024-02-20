import { Button } from "@nasa-jpl/react-stellar";
import { Page as PageType, Section as SectionType } from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import Page from "../ui/Page";
import Section from "./Section";
import "./ViewPage.css";

export declare type PageProps = {
  onPageChange: (page: PageType) => void;
  viewPage?: PageType;
};

// TODO consider if we need to disambiguate View<Page|Entity|Section> from the component names?
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
            const newViewPage: PageType = {
              ...viewPage,
              sections: [
                ...viewPage.sections,
                {
                  title: "New Section",
                  id: generateUUID(),
                  type: "section",
                  entities: [],
                  layout: [],
                  defaultOpen: true,
                  enableHeader: true,
                } as SectionType,
              ],
            };
            onPageChange(newViewPage);
          }}
        >
          Add section
        </Button>
      }
    >
      {viewPage.sections.map((section) => (
        <Section
          section={section}
          key={section.id}
          onSectionChange={(newSection: SectionType) => {
            const newViewPage: PageType = {
              ...viewPage,
              sections: viewPage.sections.map((e) => {
                if (e.id === newSection.id) {
                  return newSection;
                }
                return e;
              }),
            };
            onPageChange(newViewPage);
          }}
        />
      ))}
    </Page>
  );
};

export default ViewPage;
