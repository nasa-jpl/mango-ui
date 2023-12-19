import type { Meta, StoryObj } from "@storybook/react";
import Page from "./Page";

const meta = {
  component: Page,
  render: (args, { loaded: { view } }) => {
    console.log("view :>> ", view);
    if (view.pageGroups.length === 0 || view.pageGroups[0].pages.length === 0) {
      return <div>Error</div>;
    }
    return <Page {...args} page={view.pageGroups[0].pages[0]} />;
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onPageChange: () => {},
  },
  loaders: [
    async () => ({
      view: await (await fetch("/default-view.json")).json(),
    }),
  ],
};
