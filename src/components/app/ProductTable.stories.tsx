import type { Meta, StoryObj } from "@storybook/react";
import { generateTestDatasets } from "../../../e2e-tests/utilities/dataset";
import { ProductTable } from "./ProductTable";

const meta = {
  component: ProductTable,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof ProductTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    datasets: generateTestDatasets(100),
  },
};
