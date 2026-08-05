// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { Product } from "../../types/api";
import { DateRange } from "../../types/time";
import { Entity as EntityType } from "../../types/view";
import { EntityEditor } from "./EntityEditor";

// Isolate EntityEditor's own form wiring: stub the heavy live preview + child forms.
vi.mock("../page/Entity", () => ({
  default: () => <div data-testid="entity-preview" />,
}));
vi.mock("./ProductsSelector", () => ({
  default: () => <div data-testid="products-selector" />,
}));
vi.mock("./InputForm", () => ({ InputForm: () => <div /> }));
vi.mock("./Tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeAll(() => {
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => cleanup());

const dateRange: DateRange = { start: "2020-01-01", end: "2020-01-02" };

function makeEntity(): EntityType {
  return {
    id: "e1",
    type: "chart",
    title: "My Chart",
  } as unknown as EntityType;
}

function renderEditor() {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const onDateRangeChange = vi.fn();
  render(
    <EntityEditor
      entity={makeEntity()}
      dateRange={dateRange}
      dateBounds={dateRange}
      products={[] as Product[]}
      onSave={onSave}
      onCancel={onCancel}
      onDateRangeChange={onDateRangeChange}
    />,
  );
  return { onSave, onCancel, onDateRangeChange };
}

test("renders the editor header with Done/Discard and the title pre-filled", () => {
  renderEditor();
  expect(screen.getByText("Edit Entity")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Discard Changes" }),
  ).toBeInTheDocument();
  expect(screen.getByDisplayValue("My Chart")).toBeInTheDocument();
});

test("Discard Changes calls onCancel", async () => {
  const user = userEvent.setup();
  const { onCancel } = renderEditor();
  await user.click(screen.getByRole("button", { name: "Discard Changes" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("Done saves the current entity unchanged when nothing is edited", async () => {
  const user = userEvent.setup();
  const { onSave } = renderEditor();
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave.mock.calls[0][0]).toMatchObject({
    id: "e1",
    title: "My Chart",
  });
});

test("editing the title is reflected in the saved entity", async () => {
  const user = userEvent.setup();
  const { onSave } = renderEditor();
  fireEvent.change(screen.getByDisplayValue("My Chart"), {
    target: { value: "Renamed Chart" },
  });
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(onSave.mock.calls[0][0]).toMatchObject({ title: "Renamed Chart" });
});

test("only the Products tab is enabled; Events and Transformations are disabled", () => {
  renderEditor();
  expect(screen.getByRole("tab", { name: "Products" })).toBeEnabled();
  expect(screen.getByRole("tab", { name: "Events" })).toBeDisabled();
  expect(screen.getByRole("tab", { name: "Transformations" })).toBeDisabled();
});
