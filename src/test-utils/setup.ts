// Global test setup. Safe for both the default node environment (pure-logic tests)
// and jsdom-environment tests (component tests opt in via `// @vitest-environment jsdom`).
// Importing jest-dom's matchers only extends `expect`; it does not require a DOM at
// import time, so this is safe to load for node-environment test files too.
import "@testing-library/jest-dom/vitest";
