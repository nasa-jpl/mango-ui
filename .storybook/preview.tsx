import { TooltipProvider } from "@nasa-jpl/react-stellar";
import "@nasa-jpl/react-stellar/dist/esm/stellar.css";
import type { Preview } from "@storybook/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import "../src/Variables.css";
import "../src/index.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/"]}>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </MemoryRouter>
    ),
  ],
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
