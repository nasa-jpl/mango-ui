import type { Meta, StoryObj } from "@storybook/react";
import { generateUniqueName } from "../../../../e2e-tests/utilities/generic";
import DataGrid from "./DataGrid";

const meta = {
  component: DataGrid,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof DataGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [];
for (let i = 0; i < 1000; i++) {
  rows.push({ field1: generateUniqueName(), field2: Math.random() });
}

export const Default: Story = {
  args: {
    rowData: rows,
    columnDefs: [
      {
        field: "field1",
        filter: "string",
        headerName: "Field 1",
        resizable: true,
        sortable: true,
      },
      {
        field: "field2",
        filter: "number",
        headerName: "Field 2",
        resizable: true,
        sortable: true,
      },
    ],
  },
};
