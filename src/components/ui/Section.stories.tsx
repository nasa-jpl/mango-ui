import type { Meta, StoryObj } from "@storybook/react";
import Section from "./Section";

const meta = {
  component: Section,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

const child = (width: number = 100, height: number = 100) => (
  <div
    className="st-typography-label"
    style={{
      border: "1px solid var(--st-gray-30)",
      background: "white",
      borderRadius: "4px",
      width: `${width}px`,
      height: `${height}px`,
      padding: "8px",
    }}
  >
    Content
  </div>
);

export const Default: Story = {
  args: {
    title: "Section",
    children: [
      child(),
      child(100, 150),
      child(100, 150),
      child(500, 200),
      child(),
      child(),
      child(400),
      child(),
    ],
  },
};

export const DefaultOpen: Story = {
  args: {
    ...Default.args,
    defaultOpen: true,
  },
};
