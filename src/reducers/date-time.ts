import { PageDateRangeAction, UPDATE_PAGE_DATE_RANGE } from "../types/actions";
import { PageDateRangeState } from "../types/state";

export const pageDateRangeReducer = (
  state: PageDateRangeState,
  action: PageDateRangeAction
) => {
  switch (action.type) {
    case UPDATE_PAGE_DATE_RANGE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
};
