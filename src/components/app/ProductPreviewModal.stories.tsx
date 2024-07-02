import type { Meta, StoryObj } from "@storybook/react";
import {
  generateTestProduct,
  generateTestProducts,
} from "../../../e2e-tests/utilities/product";
import ProductPreviewModal from "./ProductPreviewModal";

const meta = {
  component: ProductPreviewModal,
} satisfies Meta<typeof ProductPreviewModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    products: generateTestProducts(100),
    product: generateTestProduct(),
  },
};
