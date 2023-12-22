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
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const tableEntity: TableEntity = {
  id: "123",
  type: "chart",
  title: "Chart 1",
  /* TODO how should we relate entities and datasets and configuration of datasets in the table? */
};

export const Default: Story = {
  args: {
    tableEntity,
  },
};
