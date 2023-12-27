import type { Meta, StoryObj } from "@storybook/react";
import { generateTestDatasets } from "../../../../e2e-tests/utilities/dataset";
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
  type: "chart",
  id: "123",
  datasets: generateTestDatasets(10),
  title: "Chart 1",
  fields: ["name", "mission", "id"],
  /* TODO how should we relate entities and datasets and configuration of datasets in the table? */
};

export const Default: Story = {
  args: {
    tableEntity,
  },
};
