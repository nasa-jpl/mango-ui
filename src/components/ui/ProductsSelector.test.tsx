// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Product } from "../../types/api";
import ProductsSelector from "./ProductsSelector";
import { SelectedProduct } from "./EntityEditor";

// Isolate ProductsSelector's own orchestration: stub the child ProductSelector
// (Radix Select-heavy, tested elsewhere) and the Tooltip (needs a provider).
vi.mock("./ProductSelector", () => ({
  ProductSelector: ({ selectedProduct }: { selectedProduct: SelectedProduct }) => (
    <div data-testid="product-selector">{selectedProduct.id}</div>
  ),
}));
vi.mock("./Tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

afterEach(() => cleanup());

const noopFieldFilter = () => true;

function makeProduct(overrides: Partial<SelectedProduct> = {}): SelectedProduct {
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

function renderSelector(selectedProducts: SelectedProduct[]) {
  const onChange = vi.fn();
  const { container } = render(
    <ProductsSelector
      products={[] as Product[]}
      selectedProducts={selectedProducts}
      onChange={onChange}
      fieldFilter={noopFieldFilter}
      multiple={false}
    />,
  );
  return { onChange, container };
}

// Per-row icon buttons render in DOM order: [Filter, Duplicate, Delete].
function rowButtons() {
  const add = screen.getByRole("button", { name: /Add Product/ });
  return screen.getAllByRole("button").filter((b) => b !== add);
}

let user: ReturnType<typeof userEvent.setup>;
beforeEach(() => {
  user = userEvent.setup();
});

test("renders one ProductSelector per product plus an Add Product button", () => {
  renderSelector([makeProduct({ id: "a" }), makeProduct({ id: "b" })]);
  expect(screen.getAllByTestId("product-selector")).toHaveLength(2);
  expect(screen.getByRole("button", { name: /Add Product/ })).toBeInTheDocument();
});

test("Add Product appends a blank product with a fresh id", async () => {
  const { onChange } = renderSelector([makeProduct({ id: "a" })]);
  await user.click(screen.getByRole("button", { name: /Add Product/ }));

  expect(onChange).toHaveBeenCalledTimes(1);
  const next = onChange.mock.calls[0][0] as SelectedProduct[];
  expect(next).toHaveLength(2);
  const added = next[1];
  expect(added).toMatchObject({
    mission: "",
    instrument: "",
    dataset: "",
    fields: [],
    version: "",
  });
  expect(typeof added.id).toBe("string");
  expect(added.id).not.toBe("a");
});

test("Delete removes the product", async () => {
  const { onChange } = renderSelector([makeProduct({ id: "a" })]);
  await user.click(rowButtons()[2]);
  expect(onChange).toHaveBeenCalledWith([]);
});

test("Duplicate inserts a copy with a new id right after the original", async () => {
  const { onChange } = renderSelector([makeProduct({ id: "a", dataset: "ds9" })]);
  await user.click(rowButtons()[1]);

  const next = onChange.mock.calls[0][0] as SelectedProduct[];
  expect(next).toHaveLength(2);
  expect(next[0].id).toBe("a");
  expect(next[1].dataset).toBe("ds9");
  expect(next[1].id).not.toBe("a");
});

test("Filter toggle adds an empty filter when none exists", async () => {
  const { onChange } = renderSelector([makeProduct({ id: "a" })]);
  await user.click(rowButtons()[0]);
  const next = onChange.mock.calls[0][0] as SelectedProduct[];
  expect(next[0].filter).toEqual([]);
});

test("Filter toggle removes an existing filter", async () => {
  const { onChange } = renderSelector([
    makeProduct({ id: "a", filter: ["x=1"] }),
  ]);
  await user.click(rowButtons()[0]);
  const next = onChange.mock.calls[0][0] as SelectedProduct[];
  expect("filter" in next[0]).toBe(false);
});
