/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  test: {
    include: ["./src/**/*.test.ts"],
    outputFile: {
      json: "unit-test-results/json-results.json",
      junit: "unit-test-results/junit-results.xml",
    },
    reporters: ["verbose", "json", "junit"],
  },
});
