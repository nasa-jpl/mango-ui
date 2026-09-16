import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist/**", "build/**", "test-metrics/**", ".stryker-tmp/**"] },
  js.configs.recommended,
  // Mirrors eslintrc's `plugin:@typescript-eslint/recommended`, which layers
  // eslint-recommended (turns off core rules TS already checks, e.g. no-undef)
  // underneath the plugin's own recommended set.
  tsPlugin.configs["flat/eslint-recommended"],
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      globals: globals.browser,
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/member-ordering": [
        "error",
        {
          default: {
            memberTypes: [
              "call-signature",
              "field",
              "constructor",
              "get",
              "method",
              "set",
              "signature",
            ],
            order: "alphabetically",
          },
        },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "react-refresh/only-export-components": "warn",
    },
  },
];
