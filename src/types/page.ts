import { Product } from "./api";
import { DateRange } from "./time";

export type PageOptions = {
  showHoverDate: boolean;
};

export type ProductPreview = {
  dateRange?: DateRange;
  field?: string;
  product: Product | undefined;
  version?: string;
};
