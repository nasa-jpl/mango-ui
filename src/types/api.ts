export type Dataset = {
  /* Fields available for querying */
  available_fields: DatasetField[];
  /* Logarithmic aggregation/decimation factors that can be requested for this dataset */
  available_resolutions: DatasetResolution[];
  /* Versions available for this dataset (e.g. "04", "05", etc) */
  available_versions: string[];
  /* <mission>_<dataset_id> */
  full_id: string;
  id: string;
  mission: string;
  /* maximum number of values that the query will return */
  query_result_limit: number;
  streams: Stream[];
  /* the field in the dataset that denotes the time axis */
  timestamp_field: string;
};

export type DatasetField = {
  constant_value?: (string | number)[];
  name: string;
  supported_aggregations: DatasetAggregationType[];
};

export type DatasetResolution = {
  downsampling_factor: number;
  nominal_data_interval_seconds: number;
};

/* TODO could use a rename https://jpl.slack.com/archives/C05BULTQEN7/p1709659838448609?thread_ts=1709615444.609529&cid=C05BULTQEN7 */
export type DatasetAggregationType = "value" | "min" | "max" | "avg";

export interface DatasetStream extends Omit<Dataset, "streams"> {
  /* No data begin/end until API fixes it */
  // data_begin: string;
  // data_end: string;
  streamId: string;
}

export type Stream = {
  data_begin: string; // timestamp
  data_end: string; // timestamp
  id: string;
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
  [key: string]: Record<DatasetAggregationType, number>;
} & { timestamp: string };

export type DataResponseError = {
  detail: string;
};
