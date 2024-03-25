import { Button, Label } from "@nasa-jpl/react-stellar";
import { useReducer } from "react";
import { Dataset } from "../../types/api";
import { DateRange } from "../../types/time";
import { Page as PageType, Section as SectionType } from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import { toDatetimelocalStr, toUTCms } from "../../utilities/time";
import Page from "../ui/Page";
import Section from "./Section";
import "./ViewPage.css";

export declare type PageProps = {
  datasets: Dataset[];
  loadingInitialData: boolean;
  onPageChange: (page: PageType) => void;
  viewPage?: PageType;
};

// TODO consider if we need to disambiguate View<Page|Entity|Section> from the component names?
export const ViewPage = ({
  datasets,
  loadingInitialData,
  viewPage,
  onPageChange,
}: PageProps) => {
  // TODO: Pull out state management and maybe refactor a bit
  type State = {
    dateRange: DateRange;
  };

  // TODO will probably be addressed in upcoming store PR
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reducer = (state: State, action: any): State => {
    switch (action.type) {
      case "UPDATE_PAGE_DATE_RANGE":
        return { ...state, ...action.payload };
      default:
        return state;
    }
  };

  const initialState: State = {
    // TODO: Refactor to pull from config
    dateRange: {
      end: new Date(Date.UTC(2022, 2, 2, 0, 36)).toISOString(), //2022-03-02T00:36:00
      start: new Date(Date.UTC(2022, 2, 2, 0, 26)).toISOString(), //2022-03-02T00:26:00
    },
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // TODO will probably be addressed in upcoming store PR
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateDateRange = (newDateRange: any) => {
    dispatch({ type: "UPDATE_PAGE_DATE_RANGE", payload: newDateRange });
  };

  if (!viewPage) {
    return;
  }

  return (
    <Page
      title={viewPage.title}
      pageHeaderChildren={
        <>
          <Label htmlFor="pageStartTime">Start:</Label>
          <input
            type="datetime-local"
            id="page-datetime-start"
            className="st-input"
            name="pageStartTime"
            defaultValue={toDatetimelocalStr(state.dateRange.start)}
            onChange={(e) =>
              updateDateRange({
                dateRange: {
                  ...state.dateRange,
                  start: new Date(toUTCms(e.target.value)).toISOString(),
                },
              })
            }
          ></input>
          <Label htmlFor="pageEndTime">End:</Label>
          <input
            type="datetime-local"
            id="page-datetime-end"
            className="st-input"
            name="pageEndTime"
            defaultValue={toDatetimelocalStr(state.dateRange.end)}
            onChange={(e) =>
              updateDateRange({
                dateRange: {
                  ...state.dateRange,
                  end: new Date(toUTCms(e.target.value)).toISOString(),
                },
              })
            }
          ></input>
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
                    dateRange: { end: "", start: "" },
                    syncWithPageDateRange: true,
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
      {!loadingInitialData &&
        viewPage.sections.map((section) => (
          <Section
            datasets={datasets}
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
