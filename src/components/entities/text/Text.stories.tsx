import type { Meta, StoryObj } from "@storybook/react";
import { TextEntity } from "../../../types/view";
import Text from "./Text";

const meta = {
  component: Text,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

const textEntity: TextEntity = {
  type: "text",
  id: "123",
  title: "Table 1",
  text: "Text",
};

export const Default: Story = {
  args: {
    textEntity,
  },
};
