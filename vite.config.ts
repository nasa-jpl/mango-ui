/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import fs from "fs";
import { defineConfig, loadEnv } from "vite";
import cesium from "vite-plugin-cesium";
import { viteStaticCopy } from "vite-plugin-static-copy";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "cesium";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [
      react(),
      cesium(),
      viteStaticCopy({
        targets: [
          { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Cesium.js`, dest: cesiumBaseUrl },
        ],
      }),
    ],
    base: env.VITE_APP_PATH,

    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
      CESIUM_BASE_URL: JSON.stringify(`/mango/${cesiumBaseUrl}`),
    },
    preview: {
      // Preview server
      https: {
        key: fs.readFileSync("./.cert/key.pem"),
        cert: fs.readFileSync("./.cert/cert.pem"),
      },
    },
    server: {
      // Development server
      cors: {
        origin: "*",
        methods: ["GET", "PUT", "POST"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "Access-Control-Allow-Credentials",
        ],
        // credentials: true,
      },
      https: {
        key: fs.readFileSync("./.cert/key.pem"),
        cert: fs.readFileSync("./.cert/cert.pem"),
      },
      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    test: {
      include: ["./src/**/*.test.{ts,tsx}"],
      // Default to the fast node environment; component tests opt into jsdom per-file
      // with `// @vitest-environment jsdom`. Do not force jsdom on pure-logic tests.
      environment: "node",
      setupFiles: ["./src/test-utils/setup.ts"],
      outputFile: {
        json: "unit-test-results/json-results.json",
        junit: "unit-test-results/junit-results.xml",
      },
      reporters: ["verbose", "json", "junit"],
      coverage: {
        provider: "v8",
        all: true,
        include: ["src/**"],
        reporter: ["text", "lcov", "json-summary"],
        reportsDirectory: "test-metrics/coverage",
        exclude: [
          // Non-logic / non-runnable sources.
          "src/types/**",
          "src/main.tsx",
          // Test scaffolding.
          "src/**/*.test.{ts,tsx}",
          "src/test-utils/**",
          // Canvas/WebGL render paths (§5): cover via extraction + e2e smoke, not here.
          "src/components/entities/map/**",
        ],
      },
    },
  };
});
