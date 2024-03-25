import type { Meta, StoryObj } from "@storybook/react";
import { ChartEntity } from "../../types/view";
import Section from "./Section";

const meta = {
  component: Section,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

const chartEntity: ChartEntity = {
  id: "123",
  dateRange: { start: "", end: "" },
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
      yAxisId: "",
    },
  ],
};

export const Default: Story = {
  args: {
    onSectionChange: () => {},
    dateRange: { start: "", end: "" },
    datasets: [],
    section: {
      id: "xyz",
      layout: [{ i: "123", x: 0, y: 0, w: 4, h: 1 }],
      title: "Section",
      defaultOpen: true,
      enableHeader: true,
      entities: [chartEntity],
    },
  },
};

export const WithoutHeader: Story = {
  args: {
    ...Default.args,
    section: {
      ...Default.args.section,
      enableHeader: false,
    },
  },
};
