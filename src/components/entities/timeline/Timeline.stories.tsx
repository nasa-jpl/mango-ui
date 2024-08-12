import type { Meta, StoryObj } from "@storybook/react";
import { TimelineEntity } from "../../../types/view";
import Timeline from "./Timeline";

const meta = {
  component: Timeline,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const timelineEntity: TimelineEntity = {
  type: "timeline",
  id: "123",
  title: "Timeline 1",
  marginLeft: 100,
  rows: [],
  dateRange: {
    end: "",
    start: "",
  },
};

export const Default: Story = {
  args: {
    timelineEntity,
    hoverDate: null,
    onSetProductPreview: () => {},
    products: [],
    dateRange: {
      end: "",
      start: "",
    },
  },
};
