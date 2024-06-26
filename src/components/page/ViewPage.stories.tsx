import type { Meta, StoryObj } from "@storybook/react";
import ViewPage from "./ViewPage";

const meta = {
  component: ViewPage,
  render: (args, { loaded: { view } }) => {
    if (view.pageGroups.length === 0 || view.pageGroups[0].pages.length === 0) {
      return <div>Error</div>;
    }
    return <ViewPage {...args} viewPage={view.pageGroups[0].pages[1]} />;
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ViewPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onPageChange: () => {},
    products: [] /* TODO fetch from API */,
    loadingInitialData: false,
  },
  loaders: [
    async () => ({
      view: await (await fetch("default-view.json")).json(),
    }),
  ],
};
