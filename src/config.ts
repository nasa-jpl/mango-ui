export const config = {
  api: {
    data: {
      missions: "/missions/",
      datasets: "/missions/{MISSION}/datasets/",
      data: "/missions/{MISSION}/datasets/{DATASET}/versions/{VERSION}/streams/{STREAM}/data",
    },
  },
  endpoints: {
    data: "http://0.0.0.0:8000",
  },
};
