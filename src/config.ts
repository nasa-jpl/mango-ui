export const config = {
  api: {
    data: {
      data: "/datasets/{SPACECRAFT}/streams/{STREAM_ID}/data",
      metadata: "/datasets/{SPACECRAFT}/",
    },
  },
  endpoints: {
    data: "http://0.0.0.0:5464",
  },
};
