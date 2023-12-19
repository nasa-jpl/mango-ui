import type { Meta, StoryObj } from "@storybook/react";
import { ChartEntity } from "../../../types/view";
import Chart from "./Chart";

const meta = {
  component: Chart,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

const chartEntity: ChartEntity = {
  id: "123",
  type: "chart",
  title: "Chart 1",
  yAxes: [],
};

export const Default: Story = {
  args: {
    chartEntity,
  },
};
