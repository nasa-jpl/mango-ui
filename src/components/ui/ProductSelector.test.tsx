// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Product, ProductField } from "../../types/api";
import { DateRange } from "../../types/time";
import { getData } from "../../utilities/api";
import { SelectedProduct } from "./EntityEditor";
import { ProductSelector } from "./ProductSelector";

vi.mock("../../utilities/api", () => ({ getData: vi.fn() }));

// Stellar's Select wraps Radix, which needs pointer APIs jsdom does not implement.
// Swap the family for a flat list of buttons so options are clickable; everything
// else from the design system stays real.
vi.mock("@nasa-jpl/stellar-react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@nasa-jpl/stellar-react")>();
  const { createContext, createElement, useContext } = await import("react");
  const OnValueChange = createContext<(value: string) => void>(() => {});

  type SelectProps = {
    children?: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  };
  type ItemProps = { children?: React.ReactNode; value: string };

  return {
    ...actual,
    Select: ({ children, onValueChange, value }: SelectProps) =>
      createElement(
        OnValueChange.Provider,
        { value: onValueChange ?? (() => {}) },
        createElement("div", { "data-select-value": value }, children),
      ),
    SelectContent: ({ children }: SelectProps) =>
      createElement("div", null, children),
    SelectItem: ({ children, value }: ItemProps) => {
      const onValueChange = useContext(OnValueChange);
      return createElement(
        "button",
        { onClick: () => onValueChange(value), role: "option", type: "button" },
        children,
      );
    },
    SelectTrigger: ({ children }: SelectProps) =>
      createElement("div", null, children),
    SelectValue: () => null,
  };
});

const getDataMock = vi.mocked(getData);

afterEach(() => cleanup());

const noopFieldFilter = () => true;
const FILTER_PLACEHOLDER = "<field_name>=<value>, <field_name>=<value>";

// Well inside SUBSET_VERSION_MAX_RANGE_DAYS; comfortably beyond it.
const SHORT_RANGE: DateRange = {
  end: "2020-01-02T00:00:00.000Z",
  start: "2020-01-01T00:00:00.000Z",
};
const LONG_RANGE: DateRange = {
  end: "2020-02-01T00:00:00.000Z",
  start: "2020-01-01T00:00:00.000Z",
};

function field(name: string): ProductField {
  return {
    is_channel_id: false,
    name,
    supported_aggregations: [],
    type: "float",
    unit: null,
  };
}

function makeProducts(fieldNames = ["temp", "subset_version"]): Product[] {
  return [
    {
      available_fields: fieldNames.map(field),
      available_resolutions: [],
      available_versions: ["v1"],
      datasets: [],
      description: "",
      full_id: "GRACE_ds1",
      id: "ds1",
      instruments: ["ACC"],
      mission: { id: "GRACE", label: "GRACE" },
      processing_level: "L1A",
      query_result_limit: 1000,
      timestamp_field: "timestamp",
    },
  ];
}

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

function renderSelector(
  selectedProduct: SelectedProduct,
  opts: { dateRange?: DateRange; products?: Product[] } = {},
) {
  const onChange = vi.fn();
  render(
    <ProductSelector
      products={opts.products ?? ([] as Product[])}
      selectedProduct={selectedProduct}
      onChange={onChange}
      fieldFilter={noopFieldFilter}
      multiple={false}
      dateRange={opts.dateRange}
    />,
  );
  return { onChange };
}

/** Make the subset-version fetch resolve with the given raw values. */
function resolveSubsetVersions(values: (string | number | null)[]) {
  getDataMock.mockReturnValue({
    cancel: vi.fn(),
    json: vi.fn().mockResolvedValue({
      data: values.map((value) => ({
        subset_version: { value },
        timestamp: "t",
      })),
    }),
  } as unknown as ReturnType<typeof getData>);
}

/** The subset-version dropdown is the only Select carrying an "All" option. */
const subsetVersionOptions = () =>
  screen
    .queryAllByRole("option")
    .filter((o) => /^(All|\d+)$/.test(o.textContent ?? ""));

const lastFilter = (onChange: ReturnType<typeof vi.fn>) =>
  (onChange.mock.calls.at(-1)?.[0] as SelectedProduct).filter;

beforeEach(() => {
  vi.clearAllMocks();
  getDataMock.mockReturnValue({
    cancel: vi.fn(),
    json: vi.fn().mockResolvedValue({}),
  } as unknown as ReturnType<typeof getData>);
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

// --- subset version dropdown -------------------------------------------------

test("renders the subset-version dropdown with All plus the fetched versions", async () => {
  resolveSubsetVersions([2, 10, 1]);
  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(subsetVersionOptions()).toHaveLength(4));
  // Numeric-aware sort keeps 10 after 2 rather than lexicographically before it.
  expect(subsetVersionOptions().map((o) => o.textContent)).toEqual([
    "All",
    "1",
    "2",
    "10",
  ]);
});

test("de-duplicates subset versions and ignores null values", async () => {
  resolveSubsetVersions([1, "1", null, 2]);
  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(subsetVersionOptions()).toHaveLength(3));
  expect(subsetVersionOptions().map((o) => o.textContent)).toEqual([
    "All",
    "1",
    "2",
  ]);
});

test("requests subset_version at full resolution over the selected range", async () => {
  resolveSubsetVersions([1]);
  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(getDataMock).toHaveBeenCalledTimes(1));
  const args = getDataMock.mock.calls[0];
  expect(args[4]).toEqual(["subset_version"]);
  expect(args[6]).toBe(SHORT_RANGE.start);
  expect(args[7]).toBe(SHORT_RANGE.end);
  // Downsampled resolutions omit subset_version, so the factor must be pinned to 1.
  expect(args[8]).toBe(1);
});

test("hides the dropdown when the product has no subset_version field", () => {
  resolveSubsetVersions([1, 2]);
  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(["temp"]),
  });

  // render() flushes effects, so the fetch gate has already been evaluated.
  expect(getDataMock).not.toHaveBeenCalled();
  expect(subsetVersionOptions()).toHaveLength(0);
});

test("hides the dropdown when the range is longer than the subset-version maximum", async () => {
  resolveSubsetVersions([1, 2]);
  renderSelector(makeProduct(), {
    dateRange: LONG_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(getDataMock).toHaveBeenCalled());
  expect(subsetVersionOptions()).toHaveLength(0);
});

test("hides the dropdown when the fetch returns no subset versions", async () => {
  resolveSubsetVersions([]);
  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(getDataMock).toHaveBeenCalled());
  expect(subsetVersionOptions()).toHaveLength(0);
});

test("does not fetch subset versions without a date range", () => {
  renderSelector(makeProduct(), { products: makeProducts() });
  expect(getDataMock).not.toHaveBeenCalled();
  expect(subsetVersionOptions()).toHaveLength(0);
});

test("selecting a version adds a subset_version filter alongside existing filters", async () => {
  resolveSubsetVersions([1, 2]);
  const { onChange } = renderSelector(makeProduct({ filter: ["a=1"] }), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(subsetVersionOptions()).toHaveLength(3));
  fireEvent.click(screen.getByRole("option", { name: "2" }));

  expect(lastFilter(onChange)).toEqual(["a=1", "subset_version=2"]);
});

test("selecting a different version replaces the previous subset_version filter", async () => {
  resolveSubsetVersions([1, 2]);
  const { onChange } = renderSelector(
    makeProduct({ filter: ["a=1", "subset_version=1"] }),
    { dateRange: SHORT_RANGE, products: makeProducts() },
  );

  await waitFor(() => expect(subsetVersionOptions()).toHaveLength(3));
  fireEvent.click(screen.getByRole("option", { name: "2" }));

  expect(lastFilter(onChange)).toEqual(["a=1", "subset_version=2"]);
});

test("selecting All drops the subset_version filter but keeps the others", async () => {
  resolveSubsetVersions([1, 2]);
  const { onChange } = renderSelector(
    makeProduct({ filter: ["a=1", "subset_version=2"] }),
    { dateRange: SHORT_RANGE, products: makeProducts() },
  );

  await waitFor(() => expect(subsetVersionOptions()).toHaveLength(3));
  fireEvent.click(screen.getByRole("option", { name: "All" }));

  expect(lastFilter(onChange)).toEqual(["a=1"]);
});

test("selecting All leaves a non-array filter untouched", async () => {
  resolveSubsetVersions([1, 2]);
  // No `filter` key at all: the All branch must not materialise one.
  const { onChange } = renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(subsetVersionOptions()).toHaveLength(3));
  fireEvent.click(screen.getByRole("option", { name: "All" }));

  expect(lastFilter(onChange)).toBeUndefined();
});

// --- out-of-range warning ----------------------------------------------------

test("warns when a subset_version filter is applied but the range is too long", async () => {
  resolveSubsetVersions([1]);
  renderSelector(makeProduct({ filter: ["subset_version=2"] }), {
    dateRange: LONG_RANGE,
    products: makeProducts(),
  });

  await waitFor(() =>
    expect(
      screen.getByText(/Subset versions are unavailable for time ranges beyond/),
    ).toBeInTheDocument(),
  );
});

test("does not warn when the range is too long but no subset_version is applied", async () => {
  resolveSubsetVersions([1]);
  renderSelector(makeProduct({ filter: ["a=1"] }), {
    dateRange: LONG_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(getDataMock).toHaveBeenCalled());
  expect(screen.queryByText(/Subset versions are unavailable/)).toBeNull();
});

test("does not warn when the range is short enough for subset versions", async () => {
  resolveSubsetVersions([2]);
  renderSelector(makeProduct({ filter: ["subset_version=2"] }), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(getDataMock).toHaveBeenCalled());
  expect(screen.queryByText(/Subset versions are unavailable/)).toBeNull();
});

// --- fetch failure handling --------------------------------------------------

test("clears the dropdown and logs when the subset-version fetch fails", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  getDataMock.mockReturnValue({
    cancel: vi.fn(),
    json: vi.fn().mockRejectedValue(new Error("boom")),
  } as unknown as ReturnType<typeof getData>);

  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(consoleError).toHaveBeenCalled());
  expect(subsetVersionOptions()).toHaveLength(0);
  consoleError.mockRestore();
});

test("stays quiet when the subset-version fetch is aborted", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const abortError = new Error("aborted");
  abortError.name = "AbortError";
  getDataMock.mockReturnValue({
    cancel: vi.fn(),
    json: vi.fn().mockRejectedValue(abortError),
  } as unknown as ReturnType<typeof getData>);

  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });

  await waitFor(() => expect(getDataMock).toHaveBeenCalled());
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

test("cancels the in-flight subset-version fetch on unmount", async () => {
  const cancel = vi.fn();
  getDataMock.mockReturnValue({
    cancel,
    json: vi.fn().mockResolvedValue({ data: [] }),
  } as unknown as ReturnType<typeof getData>);

  renderSelector(makeProduct(), {
    dateRange: SHORT_RANGE,
    products: makeProducts(),
  });
  await waitFor(() => expect(getDataMock).toHaveBeenCalled());
  cleanup();

  expect(cancel).toHaveBeenCalled();
});
