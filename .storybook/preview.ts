import "@nasa-jpl/react-stellar/dist/esm/stellar.css";
import type { Preview } from "@storybook/react";
import "../src/Variables.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
