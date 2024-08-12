import type { Meta, StoryObj } from "@storybook/react";
import { TableEntity } from "../../../types/view";
import Table from "../table/Table";

const meta = {
  component: Table,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 600,
      },
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const tableEntity: TableEntity = {
  type: "chart",
  dateRange: { start: "", end: "" },
  id: "123",
  columns: [
    { field: "lin_accl_x", layerId: "234567" },
    { field: "lin_accl_x", layerId: "8765432" },
    { field: "bogus", layerId: "234567" },
  ],
  layers: [
    {
      id: "234567",
      fields: ["lin_accl_x"],
      mission: "GRACEFO",
      dataset: "ACT1A",
      instrument: "C",
      startTime: "2022-03-02T00:00:00.000000Z",
      endTime: "2022-03-02T00:01:00.000000Z",
      version: "04",
    },
    {
      id: "8765432",
      fields: ["lin_accl_x"],
      mission: "GRACEFO",
      dataset: "ACC1A",
      instrument: "C",
      startTime: "2022-03-02T00:00:00.000000Z",
      endTime: "2022-03-02T00:01:00.000000Z",
      version: "04",
    },
  ],
  title: "Table 1",
};

export const Default: Story = {
  args: {
    tableEntity,
    dateRange: { start: "", end: "" },
    products: [],
    onSetProductPreview: () => {},
  },
};
