export type Dataset = {
  available_fields: string[];
  full_id: string; // <mission>_<dataset_id>
  id: string;
  mission: string;
  streams: Stream[];
  timestamp_field: string; // the field in this dataset that denotes the time axis
};

export interface DatasetStream extends Omit<Dataset, "streams"> {
  data_begin: string;
  data_end: string;
  streamId: string;
}

export type Stream = {
  data_begin: string; // timestamp
  data_end: string; // timestamp
  id: string;
};

export type DataResponse = {
  data: Record<string, number | string>[];
  data_begin: string;
  data_count: number;
  data_end: string;
  from_isotimestamp: string;
  query_elapsed_ms: number;
  to_isotimestamp: string;
};

export type DataResponseError = {
  detail: string;
};
