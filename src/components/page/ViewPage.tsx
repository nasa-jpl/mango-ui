import { Page as PageType, Section as SectionType } from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import { Button, Label } from "@nasa-jpl/react-stellar";
import Page from "../ui/Page";
import Section from "./Section";
import "./ViewPage.css";
import { useReducer } from "react";
import { DateRange } from "../../types/time";

export declare type PageProps = {
  onPageChange: (page: PageType) => void;
  viewPage?: PageType;
};

// TODO consider if we need to disambiguate View<Page|Entity|Section> from the component names?
export const ViewPage = ({ viewPage, onPageChange }: PageProps) => {

  // TODO: Pull out state management and maybe refactor a bit
  type State = {
    dateRange: DateRange;
  };

  const reducer = (state: State, action: any): State => {
    switch (action.type) {
      case 'UPDATE_PAGE_DATE_RANGE':
        return { ...state, ...action.payload };
      default:
        return state;
    }
  };

  const initialState: State = {
    // TODO: Refactor to pull from config
    dateRange: {
      end: new Date(Date.UTC(2022, 2, 2, 0, 36)).toISOString(),   //2022-03-02T00:36:00
      start: new Date(Date.UTC(2022, 2, 2, 0, 26)).toISOString(), //2022-03-02T00:26:00
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const updateDateRange = (newDateRange: any) => {
    dispatch({ type: 'UPDATE_PAGE_DATE_RANGE', payload: newDateRange });
  };

  if (!viewPage) {
    return;
  }
  return (
    <Page
      title={viewPage.title}
      pageHeaderChildren={<>
        <Label htmlFor="pageStartTime">Start:</Label>
        <input type="datetime-local"
               id="page-datetime-start"
               name="pageStartTime" 
               defaultValue={state.dateRange.start.substring(0, 16)} 
               onChange={(e) => updateDateRange({ dateRange: { ...state.dateRange, start: new Date(Date.parse(e.target.value + 'Z')).toISOString() } })}>
        </input>
        <Label htmlFor="pageEndTime">End:</Label>
        <input type="datetime-local" 
               id="page-datetime-end"
               name="pageEndTime" 
               defaultValue={state.dateRange.end.substring(0,16)} 
               onChange={(e) => updateDateRange({ dateRange: { ...state.dateRange, end: new Date(Date.parse(e.target.value + 'Z')).toISOString() } })}>
        </input>
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
                  dateRange: { end: "", start: ""},
                  syncWithPageDateRange: true
                } as SectionType,
              ],
            };
            onPageChange(newViewPage);
          }}
        >
          Add section
        </Button>
        </>
      }
    >
      {viewPage.sections.map((section) => (
        <Section
          section={section}
          key={section.id}
          dateRange={state.dateRange}
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
