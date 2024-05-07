import { useReducer } from "react";
import { pageDateRangeReducer } from "../../reducers/date-time";
import { UPDATE_PAGE_DATE_RANGE } from "../../types/actions";
import { Dataset } from "../../types/api";
import { PageDateRangeState } from "../../types/state";
import { Page as PageType, Section as SectionType } from "../../types/view";
import DateRangePicker from "../ui/DateRangePicker";
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
  const initialState: PageDateRangeState = {
    // TODO: Refactor to pull from config
    dateRange: {
      end: new Date(Date.UTC(2022, 2, 2, 0, 36)).toISOString(), //2022-03-02T00:36:00
      start: new Date(Date.UTC(2022, 2, 2, 0, 26)).toISOString(), //2022-03-02T00:26:00
    },
  };

  const [state, dispatch] = useReducer(pageDateRangeReducer, initialState);

  const updateDateRange = (newDateRange: PageDateRangeState) => {
    dispatch({ type: UPDATE_PAGE_DATE_RANGE, payload: newDateRange });
  };

  if (!viewPage) {
    return;
  }

  return (
    <Page
      title={viewPage.title}
      pageHeaderChildren={
        <>
          <DateRangePicker
            startDate={new Date(state.dateRange.start)}
            endDate={new Date(state.dateRange.end)}
            onStartDateChange={(date) => {
              updateDateRange({
                dateRange: {
                  ...state.dateRange,
                  start: date.toISOString(),
                },
              });
            }}
            onEndDateChange={(date) => {
              updateDateRange({
                dateRange: {
                  ...state.dateRange,
                  end: date.toISOString(),
                },
              });
            }}
          />
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
            onDateRangeChange={(newDateRange) =>
              updateDateRange({
                dateRange: newDateRange,
              })
            }
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
