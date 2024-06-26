import type { Meta, StoryObj } from "@storybook/react";
import { generateTestProduct } from "../../../../e2e-tests/utilities/product";
import { ChartEntity } from "../../../types/view";
import Chart from "./Chart";

const meta = {
  component: Chart,
  parameters: {
    layout: "padded",
  },
  decorators: [(Story) => <Story />],
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

const chartEntity: ChartEntity = {
  id: "123",
  type: "chart",
  title: "Chart 1",
  yAxes: [],
  layers: [
    {
      id: "234567",
      field: "lin_accl_x",
      mission: "GRACEFO",
      dataset: "ACT1A",
      instrument: "C",
      startTime: "2022-03-02T00:00:00.000000Z",
      endTime: "2022-03-02T00:01:00.000000Z",
      type: "line",
      version: "04",
      yAxisId: "y1",
    },
  ],
  dateRange: {
    end: "",
    start: "",
  },
};

export const Default: Story = {
  args: {
    chartEntity,
    products: [generateTestProduct()],
    dateRange: {
      end: "",
      start: "",
    },
    hoverDate: null,
  },
};
