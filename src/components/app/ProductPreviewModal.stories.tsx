import type { Meta, StoryObj } from "@storybook/react";
import {
  generateTestDatasetStream,
  generateTestDatasets,
} from "../../../e2e-tests/utilities/dataset";
import DatasetStreamPreviewModal from "./ProductPreviewModal";

const meta = {
  component: DatasetStreamPreviewModal,
} satisfies Meta<typeof DatasetStreamPreviewModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const testDatasets = generateTestDatasets(100);

export const Default: Story = {
  args: {
    datasets: testDatasets,
    datasetStream: generateTestDatasetStream(),
  },
};
