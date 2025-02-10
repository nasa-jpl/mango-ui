export type ComputedThresholds = {
  limits: {
    lower: boolean;
    upper: boolean;
  };
  warnings: {
    lower: boolean;
    upper: boolean;
  };
};

export type ProcessedDataResponseDataEntry = {
  [key: string]: Partial<
    Record<"value" | "min" | "max" | "avg" | "centroid", string | number>
  > & {
    _thresholds?: ComputedThresholds;
  };
} & { timestamp: string };
