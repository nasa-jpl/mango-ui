/* A group of measurements, ex ACC1A */
export type Product = {
  /* Fields available for querying */
  available_fields: ProductField[];
  /* Logarithmic aggregation/decimation factors that can be requested for this product */
  available_resolutions: ProductResolution[];
  /* Versions available for this product (e.g. "04", "05", etc) */
  available_versions: string[];
  datasets: Dataset[];
  description: string;
  /* <mission>_<product_id> */
  full_id: string;
  id: string;
  instruments: string[];
  mission: string;
  processing_level: string;
  /* maximum number of values that the query will return */
  query_result_limit: number;
  /* the field in the dataset that denotes the time axis */
  timestamp_field: string;
};

/* A distinct stream of data values within a Product defined by <product_id>_<version>_<instrument>_<channel?>, ex ACC1A_04_C */
export type Dataset = {
  /* time of first entry */
  data_begin: string;
  /* time of last entry */
  data_end: string;
  /* ID of instrument */
  instrument: string;
  /* time of last update */
  last_updated: string;
  /* <mission>_<product_id> */
  product: string;
};

export type ProductField = {
  constant_value?: (string | number)[];
  description?: string;
  name: string;
  supported_aggregations: ProductAggregation[];
  type: "int" | "bool" | "float" | "str" | "datetime" | "dict"; // TODO ask about complete set
  unit: string | null;
};

export type ProductResolution = {
  downsampling_factor: number;
  nominal_data_interval_seconds: number;
};

/* TODO could use a rename https://jpl.slack.com/archives/C05BULTQEN7/p1709659838448609?thread_ts=1709615444.609529&cid=C05BULTQEN7 */
export type ProductAggregationType = "min" | "max" | "avg" | "centroid";
export type ProductAggregation = {
  field_name: string;
  type: ProductAggregationType;
};

export type DataResponse = {
  data: DataResponseDataEntry[];
  data_begin: string;
  data_count: number;
  data_end: string;
  downsampling_factor: number;
  from_isotimestamp: string;
  nominal_data_interval_seconds: number | null;
  query_elapsed_ms: number;
  to_isotimestamp: string;
};

export type DataResponseDataEntry = {
  [key: string]: Record<"value" | "min" | "max" | "avg" | "centroid", number>;
} & { timestamp: string };

export type DataResponseError = {
  detail: string;
};
