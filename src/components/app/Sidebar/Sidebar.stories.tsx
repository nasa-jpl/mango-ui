import type { Meta, StoryObj } from "@storybook/react";
import Sidebar from "./Sidebar";

const meta = {
  component: Sidebar,
  render: (args, { loaded: { view } }) => {
    return <Sidebar {...args} view={view} />;
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "App Title",
  },
  loaders: [
    async () => ({
      view: await (await fetch("default-view.json")).json(),
    }),
  ],
};
