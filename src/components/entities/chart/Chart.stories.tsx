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
  layers: [
    {
      id: "234567",
      field: "field1",
      mission: "mission1",
      datasetId: "dataset1",
      streamId: "A",
      startTime: "2022-03-02T00:00:00.000000Z",
      endTime: "2022-03-02T00:01:00.000000Z",
      type: "line",
    },
  ],
  dateRange: {
    end: "",
    start: "",
  },
  syncWithPageDateRange: false,
};

export const Default: Story = {
  args: {
    chartEntity,
    dateRange: {
      end: "",
      start: "",
    },
  },
};
