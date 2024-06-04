module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:storybook/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["react-refresh"],
  rules: {
    "no-unused-vars": "warn",
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
};
