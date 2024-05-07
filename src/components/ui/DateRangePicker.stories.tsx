import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import DateRangePicker from "./DateRangePicker";

const meta = {
  component: DateRangePicker,
  parameters: {
    layout: "padded",
    docs: {
      story: {
        inline: false,
        iframeHeight: 400,
      },
    },
  },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    startDate: new Date("2030"),
    endDate: new Date("2031"),
    onStartDateChange: () => {},
    onEndDateChange: () => {},
  },
  render: ({ startDate, endDate, ...args }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [startDateState, setStartDate] = useState<Date>(
      startDate || new Date()
    );
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [endDateState, setEndDate] = useState<Date>(endDate || new Date());
    return (
      <DateRangePicker
        {...args}
        startDate={startDateState}
        endDate={endDateState}
        onStartDateChange={(date) => {
          setStartDate(date);
          console.log("Start Date Change:", date);
        }}
        onEndDateChange={(date) => {
          setEndDate(date);
          console.log("End Date Change:", date);
        }}
      />
    );
  },
};
