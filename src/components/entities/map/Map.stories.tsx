import type { Meta, StoryObj } from "@storybook/react";
import { generateTestProduct } from "../../../../e2e-tests/utilities/product";
import { MapEntity } from "../../../types/view";
import Map from "./Map";

const meta = {
  component: Map,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Map>;

export default meta;
type Story = StoryObj<typeof meta>;

const mapEntity: MapEntity = {
  id: "123",
  dateRange: { start: "", end: "" },
  type: "map",
  title: "Map 1",
};

export const Default: Story = {
  args: {
    mapEntity,
    dateRange: { start: "", end: "" },
    products: [generateTestProduct()],
  },
};
