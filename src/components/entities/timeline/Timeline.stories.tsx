import type { Meta, StoryObj } from "@storybook/react";
import Timeline from "./Timeline";

const meta = {
  component: Timeline,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    hoverDate: null,
    marginLeft: 100,
    dateRange: {
      end: "2022-03-02T00:26:00.000000Z",
      start: "2022-03-03T00:26:00.000000Z",
    },
  },
};
