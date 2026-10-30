// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { DateRange } from "../../types/time";
import { Entity as EntityType } from "../../types/view";
import { Entity } from "./Entity";

// Isolate Entity's wiring: stub the visualizations with a button that toggles sync,
// standing in for the "Sync with page time range" menu item each one renders.
const { SyncToggle } = vi.hoisted(() => ({
  SyncToggle: ({
    onSyncWithPageDateRangeChange,
  }: {
    onSyncWithPageDateRangeChange: (sync: boolean) => void;
  }) => (
    <button onClick={() => onSyncWithPageDateRangeChange(false)}>unsync</button>
  ),
}));
vi.mock("../entities/chart/Chart", () => ({ default: SyncToggle }));
vi.mock("../entities/table/Table", () => ({ default: SyncToggle }));
vi.mock("../entities/map/Map", () => ({ default: () => <div /> }));

afterEach(() => cleanup());

const dateRange: DateRange = { start: "2020-01-01", end: "2020-01-02" };

function renderEntity(entity: EntityType) {
  const onChange = vi.fn();
  render(
    <Entity
      entity={entity}
      dateRange={dateRange}
      dateBounds={dateRange}
      hoverDate={null}
      onChange={onChange}
      onSelectPoint={() => {}}
      onSetProductPreview={() => {}}
      products={[]}
      selectedPoint={null}
    />,
  );
  return onChange;
}

test.each(["chart", "table"])(
  "toggling sync on a %s emits the entity with the updated flag",
  async (type) => {
    const entity = {
      id: "e1",
      type,
      title: "Entity",
      layers: [],
      syncWithPageDateRange: true,
    } as unknown as EntityType;
    const onChange = renderEntity(entity);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "unsync" }));

    expect(onChange).toHaveBeenCalledWith({
      ...entity,
      syncWithPageDateRange: false,
    });
  },
);
