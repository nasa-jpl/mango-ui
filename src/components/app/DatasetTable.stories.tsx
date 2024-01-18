import type { Meta, StoryObj } from "@storybook/react";
import { generateTestDatasetStreams } from "../../../e2e-tests/utilities/dataset";
import { DatasetTable } from "./DatasetTable";

const meta = {
  component: DatasetTable,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof DatasetTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    datasets: generateTestDatasetStreams(100),
  },
};
