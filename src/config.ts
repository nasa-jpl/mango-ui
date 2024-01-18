export const config = {
  api: {
    data: {
      missions: "/missions/",
      datasets: "/missions/{MISSION}/datasets/",
      data: "/datasets/{MISSION}/streams/{STREAM_ID}/data",
      metadata: "/datasets/{MISSION}",
    },
  },
  endpoints: {
    data: "http://0.0.0.0:8000",
  },
};
