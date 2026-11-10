// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { ChannelValueCombobox } from "./ChannelValueCombobox";
import { CHANNEL_VALUE_RESULT_LIMIT } from "./entity-editor-utils";

beforeAll(() => {
  // cmdk and Radix Popover rely on browser APIs jsdom does not implement.
  class ResizeObserverStub {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => cleanup());

function openCombobox() {
  fireEvent.click(screen.getByRole("combobox"));
}

test("shows a placeholder when no value is selected", () => {
  render(<ChannelValueCombobox onChange={() => {}} values={["a"]} />);
  expect(screen.getByRole("combobox")).toHaveTextContent("Select value");
});

test("shows the selected value on the trigger", () => {
  render(
    <ChannelValueCombobox onChange={() => {}} value="b" values={["a", "b"]} />,
  );
  expect(screen.getByRole("combobox")).toHaveTextContent("b");
});

test("lists values in natural order when opened", () => {
  render(
    <ChannelValueCombobox onChange={() => {}} values={["10", "2", "1"]} />,
  );
  openCombobox();
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
    "1",
    "2",
    "10",
  ]);
});

test("narrows the list as the user types", () => {
  render(
    <ChannelValueCombobox onChange={() => {}} values={["112", "12", "7"]} />,
  );
  openCombobox();
  fireEvent.change(screen.getByPlaceholderText("Search values..."), {
    target: { value: "12" },
  });
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
    "12",
    "112",
  ]);
});

test("emits the chosen value and closes", () => {
  const onChange = vi.fn();
  render(<ChannelValueCombobox onChange={onChange} values={["a", "b"]} />);
  openCombobox();
  fireEvent.click(screen.getByRole("option", { name: "b" }));
  expect(onChange).toHaveBeenCalledWith("b");
  expect(screen.queryByRole("option")).toBeNull();
});

test("caps rendered options for large value sets and says how many exist", () => {
  const values = Array.from({ length: 20000 }, (_, i) => String(i));
  render(<ChannelValueCombobox onChange={() => {}} values={values} />);
  openCombobox();
  expect(screen.getAllByRole("option")).toHaveLength(
    CHANNEL_VALUE_RESULT_LIMIT,
  );
  expect(
    screen.getByText(
      `Showing ${CHANNEL_VALUE_RESULT_LIMIT} of 20000 values. Type to narrow the list.`,
    ),
  ).toBeInTheDocument();
});

test("hides the cap notice when every match is shown", () => {
  render(<ChannelValueCombobox onChange={() => {}} values={["a", "b"]} />);
  openCombobox();
  expect(screen.queryByText(/Type to narrow the list/)).toBeNull();
});
