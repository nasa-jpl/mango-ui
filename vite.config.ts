/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [react()],
    base: env.VITE_APP_PATH,
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
  };
});
