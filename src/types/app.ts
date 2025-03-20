export type ComputedThresholds = {
  limits: {
    lower: boolean;
    lower_value: number | null;
    upper: boolean;
    upper_value: number | null;
  };
  warnings: {
    lower: boolean;
    lower_value: number | null;
    upper: boolean;
    upper_value: number | null;
  };
};

export type ProcessedDataResponseDataEntry = {
  [key: string]: Partial<
    Record<"value" | "min" | "max" | "avg" | "centroid", string | number>
  > & {
    _thresholds?: ComputedThresholds;
  };
} & { timestamp: string };
