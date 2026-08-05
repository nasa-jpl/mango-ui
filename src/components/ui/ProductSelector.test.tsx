// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Product } from "../../types/api";
import { SelectedProduct } from "./EntityEditor";
import { ProductSelector } from "./ProductSelector";

// getData is only reached for the subset-version effect, which is gated off here
// (no subset_version field); mock it so no real fetch is ever attempted.
vi.mock("../../utilities/api", () => ({
  getData: vi.fn(() => ({
    json: vi.fn().mockResolvedValue({}),
    cancel: vi.fn(),
  })),
}));

afterEach(() => cleanup());

const noopFieldFilter = () => true;
const FILTER_PLACEHOLDER = "<field_name>=<value>, <field_name>=<value>";

function makeProduct(
  overrides: Partial<SelectedProduct> = {},
): SelectedProduct {
  return {
    id: "p1",
    mission: "GRACE",
    instrument: "ACC",
    dataset: "ds1",
    fields: ["temp"],
    version: "v1",
    ...overrides,
  };
}

function renderSelector(selectedProduct: SelectedProduct) {
  const onChange = vi.fn();
  render(
    <ProductSelector
      products={[] as Product[]}
      selectedProduct={selectedProduct}
      onChange={onChange}
      fieldFilter={noopFieldFilter}
      multiple={false}
    />,
  );
  return { onChange };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("shows the filter input only when the product's filter is an array", () => {
  const { onChange } = renderSelector(makeProduct());
  expect(screen.queryByPlaceholderText(FILTER_PLACEHOLDER)).toBeNull();
  cleanup();
  onChange.mockReset();
  renderSelector(makeProduct({ filter: [] }));
  expect(screen.getByPlaceholderText(FILTER_PLACEHOLDER)).toBeInTheDocument();
});

test("pre-fills the filter input from the existing filter array", () => {
  renderSelector(makeProduct({ filter: ["a=1", "b=2"] }));
  expect(screen.getByPlaceholderText(FILTER_PLACEHOLDER)).toHaveValue(
    "a=1, b=2",
  );
});

test("parses the filter input and emits onChange when the product is complete", () => {
  const { onChange } = renderSelector(makeProduct({ filter: [] }));
  fireEvent.change(screen.getByPlaceholderText(FILTER_PLACEHOLDER), {
    target: { value: "a=1, b=2" },
  });
  const last = onChange.mock.calls.at(-1)?.[0] as SelectedProduct;
  expect(last.filter).toEqual(["a=1", "b=2"]);
});

test("trims whitespace and drops empty filter segments", () => {
  const { onChange } = renderSelector(makeProduct({ filter: [] }));
  fireEvent.change(screen.getByPlaceholderText(FILTER_PLACEHOLDER), {
    target: { value: "a=1 , , b=2 ," },
  });
  const last = onChange.mock.calls.at(-1)?.[0] as SelectedProduct;
  expect(last.filter).toEqual(["a=1", "b=2"]);
});

test("does not emit onChange while the product is incomplete", () => {
  // Missing version => isSelectedProductComplete() is false => onChange gated off.
  const { onChange } = renderSelector(makeProduct({ version: "", filter: [] }));
  fireEvent.change(screen.getByPlaceholderText(FILTER_PLACEHOLDER), {
    target: { value: "x=1" },
  });
  expect(onChange).not.toHaveBeenCalled();
});
