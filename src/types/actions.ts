import { PageDateRangeState } from "./state";

export const UPDATE_PAGE_DATE_RANGE = "UPDATE_PAGE_DATE_RANGE";

export type PageDateRangeAction = {
  payload: PageDateRangeState;
  type: string;
};
