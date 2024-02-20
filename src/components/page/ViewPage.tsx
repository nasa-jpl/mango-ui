import { Button, Label } from "@nasa-jpl/react-stellar";
import { SectionEntity, ViewPage as ViewPageType } from "../../types/view";
import Page from "../ui/Page";
import Entity from "./Entity";
import "./ViewPage.css";
import { useReducer } from "react";
import { DateRange } from "../../types/time";

export declare type PageProps = {
  viewPage?: ViewPageType;
  onPageChange: (page: ViewPageType) => void;
};

export const ViewPage = ({ viewPage, onPageChange }: PageProps) => {

  // TODO: Pull out state management and maybe refactor a bit
  type State = {
    pageDateRange: DateRange;
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
    // Hard-coded default dates for now so the tool shows data upon loading
    pageDateRange: {
      end: new Date(Date.UTC(2022, 2, 2, 0, 1)).toISOString(),   //2022-03-02T00:01:00
      start: new Date(Date.UTC(2022, 2, 2, 0, 0)).toISOString(), //2022-03-02T00:00:00
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
               name="pageStartTime" 
               defaultValue={state.pageDateRange.start.substring(0, 16)} 
               onChange={(e) => updateDateRange({ pageDateRange: { ...state.pageDateRange, start: new Date(Date.parse(e.target.value + 'Z')).toISOString() } })}>
        </input>
        <Label htmlFor="pageEndTime">End:</Label>
        <input type="datetime-local" 
               name="pageEndTime" 
               defaultValue={state.pageDateRange.end.substring(0,16)} 
               onChange={(e) => updateDateRange({ pageDateRange: { ...state.pageDateRange, end: new Date(Date.parse(e.target.value + 'Z')).toISOString() } })}>
        </input>
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
                  dateRange: { end: "", start: ""},
                  syncWithPageTime: true
                } as SectionEntity,
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
      {viewPage.entities.map((entity) => (
        <Entity entity={entity} key={entity.id} pageDateRange={state.pageDateRange} />
      ))}
    </Page>
  );
};

export default ViewPage;
