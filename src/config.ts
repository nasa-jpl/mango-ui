export const config = {
  api: {
    data: {
      missions: "/missions/",
      products: "/missions/{MISSION}/products",
      data: "/missions/{MISSION}/products/{DATASET}/versions/{VERSION}/instruments/{INSTRUMENT}/data",
    },
  },
  endpoints: {
    // If running in development mode, VITE_PROXY_API_URL will be defined. If running
    // in production mode it will not and the API URL will be injected at runtime.
    data: import.meta.env.DEV
      ? import.meta.env.VITE_PROXY_API_URL
      : "{PLACEHOLDER_API_URL}",

    docs: "{PLACEHOLDER_MANGO_DOCS_URL}",
  },
};
