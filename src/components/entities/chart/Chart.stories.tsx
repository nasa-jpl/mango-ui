import type { Meta, StoryObj } from "@storybook/react";
import { generateTestDataset } from "../../../../e2e-tests/utilities/dataset";
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
      field: "ACT1A",
      mission: "GRACEFO",
      dataset: "dataset1",
      instrument: "A",
      startTime: "2022-03-02T00:00:00.000000Z",
      endTime: "2022-03-02T00:01:00.000000Z",
      type: "line",
      version: "04",
      yAxisId: "",
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
    datasets: [generateTestDataset()],
    dateRange: {
      end: "",
      start: "",
    },
    hoverDate: null,
  },
};
