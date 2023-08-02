export const config = {
  endpoints: {
    data: "http://0.0.0.0:5463",
  },
  api: {
    data: {
      metadata: "/datasets/{SPACECRAFT}/fields",
      data: "/datasets/{SPACECRAFT}/data",
    },
  },
};
