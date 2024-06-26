export const config = {
  api: {
    data: {
      missions: "/missions/",
      products: "/missions/{MISSION}/products/",
      data: "/missions/{MISSION}/products/{DATASET}/versions/{VERSION}/instruments/{INSTRUMENT}/data",
    },
  },
  endpoints: {
    data: import.meta.env.VITE_API_URL,
  },
};
