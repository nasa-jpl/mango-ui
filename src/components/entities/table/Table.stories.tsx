import type { Meta, StoryObj } from "@storybook/react";
import { generateUniqueName } from "../../../../e2e-tests/utilities/generic";
import { TableEntity } from "../../../types/view";
import { generateUUID } from "../../../utilities/generic";
import Table from "../table/Table";

type TableRow = {
  id: string;
  name: string;
};

const meta = {
  component: Table,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const tableEntity: TableEntity<TableRow> = {
  type: "chart",
  dateRange: { start: "", end: "" },
  id: "123",
  rows: [
    { id: generateUUID(), name: generateUniqueName() },
    { id: generateUUID(), name: generateUniqueName() },
    { id: generateUUID(), name: generateUniqueName() },
    { id: generateUUID(), name: generateUniqueName() },
  ],
  title: "Table 1",
  fields: ["id", "name"],

  /* TODO how should we relate entities and datasets and configuration of datasets in the table? */
};

export const Default: Story = {
  args: {
    tableEntity,
    dateRange: { start: "", end: "" },
  },
};
