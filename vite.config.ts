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
        // Phase 5 ratchets (§5 "Ratchets, not aspirational thresholds"): per-scope
        // floors set slightly below current reality so coverage can only go up. NO
        // global threshold (the repo-wide number is meaningless with `all: true` and
        // by-design-untested canvas/route code — §5 "Never headline a single global
        // number"). Only scopes we have deliberately invested in are gated here; raise
        // these as later work lands. Baselines captured from
        // test-metrics/coverage/coverage-summary.json.
        thresholds: {
          // Pure core — must stay saturated (§4). Aggregate: L/S/F 100, B 95.73
          // (product.ts drags branches to 87.75 per-file).
          "src/utilities/**": {
            lines: 99,
            statements: 99,
            functions: 99,
            branches: 87,
          },
          // Extracted pure-logic modules (also under the Stryker scope). Fully
          // covered today — keep them there.
          "src/components/entities/chart/chart-data.ts": {
            lines: 100,
            statements: 100,
            functions: 100,
            branches: 100,
          },
          "src/components/entities/table/table-utils.ts": {
            lines: 100,
            statements: 100,
            functions: 100,
            branches: 100,
          },
          "src/components/ui/DataGrid/data-grid-utils.ts": {
            lines: 100,
            statements: 100,
            functions: 100,
            branches: 100,
          },
          "src/components/ui/date-range-utils.ts": {
            lines: 100,
            statements: 100,
            functions: 100,
            branches: 100,
          },
          "src/components/ui/entity-editor-utils.ts": {
            lines: 100,
            statements: 100,
            functions: 100,
            branches: 100,
          },
          // Interaction/wiring components characterized in Phase 3.
          "src/components/app/SaveViewModal.tsx": {
            lines: 98,
            statements: 98,
            functions: 70,
            branches: 98,
          },
          "src/components/ui/AlertDialogProvider.tsx": {
            lines: 96,
            statements: 96,
            functions: 85,
            branches: 85,
          },
          "src/components/ui/ProductsSelector.tsx": {
            lines: 90,
            statements: 90,
            functions: 80,
            branches: 92,
          },
          "src/components/ui/ProductSelector.tsx": {
            lines: 82,
            statements: 82,
            functions: 44,
            branches: 90,
          },
          // Directory ratchets for scopes that are broadly covered.
          "src/components/app/Sidebar/**": {
            lines: 98,
            statements: 98,
            functions: 74,
            branches: 93,
          },
          "src/hooks/**": {
            lines: 87,
            statements: 87,
            functions: 95,
            branches: 72,
          },
        },
      },
    },
  };
});
