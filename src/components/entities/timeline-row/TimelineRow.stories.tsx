import type { Meta, StoryObj } from "@storybook/react";
import { ChartEntity, TimelineRowEntity } from "../../../types/view";
import TimelineRow from "./TimelineRow";

const meta = {
  component: TimelineRow,
} satisfies Meta<typeof TimelineRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const timelineRowEntity: TimelineRowEntity = {
  entity: {
    id: "aedfsrdvc",
    type: "chart",
    title: "Coalesced Angular Acceleration X (m/sec²)",
    syncWithPageDateRange: true,
    yAxes: [
      {
        id: "y1",
        label: "",
        position: "left",
      },
    ],
    layers: [
      {
        id: "3ewfsvd",
        field: "ang_accl_x",
        version: "04",
        mission: "GRACEFO",
        dataset: "ACC1A",
        instrument: "D",
        startTime: "2022-03-02T00:26:00.000000Z",
        endTime: "2022-03-02T00:36:00.000000Z",
        yAxisId: "y1",
      },
    ],
  } as ChartEntity,
  type: "timeline-row",
  id: "123",
  title: "Timeline Row 1",
  subrows: [],
  dateRange: {
    end: "",
    start: "",
  },
};

export const Default: Story = {
  args: {
    marginLeft: 200,
    hoverDate: null,
    onSetProductPreview: () => {},
    products: [],
    timelineRowEntity,
    dateRange: {
      end: "",
      start: "",
    },
  },
};
