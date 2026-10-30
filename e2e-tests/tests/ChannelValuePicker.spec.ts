import { expect, Page, test } from "@playwright/test";
import { MISSION, PRODUCT, setupApiMocks } from "../utilities/mockApi";

// Products like OFFRED store field ids as key-value pairs, so a single channel
// field can enumerate tens of thousands of values.
const CHANNEL_VALUE_COUNT = 20000;

const LARGE_CHANNEL_PRODUCT = {
  ...PRODUCT,
  available_fields: [
    ...PRODUCT.available_fields,
    {
      name: "field_id",
      supported_aggregations: [],
      unit: null,
      type: "str",
      is_channel_id: true,
      enum_values: Array.from({ length: CHANNEL_VALUE_COUNT }, (_, i) =>
        String(i),
      ),
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page, { products: [LARGE_CHANNEL_PRODUCT] });
  await page.goto("/mango/");
  await page.getByRole("button", { name: "Page A" }).click();
  await expect(page.getByText("My Chart")).toBeVisible();
});

async function openChartEditor(page: Page) {
  await page.getByText("My Chart").hover();
  // .right-content buttons: [zoom out, zoom in, more options]. Last = more options.
  await page
    .locator(".right-content")
    .first()
    .getByRole("button")
    .last()
    .click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page.getByText("Edit Entity")).toBeVisible();
}

async function selectProduct(page: Page) {
  await page.getByRole("button", { name: /Add Product/ }).click();
  await page.getByText("Select mission").click();
  await page.getByRole("option", { name: MISSION.label }).click();
  await page.getByText("Select instrument").click();
  await page.getByRole("option", { name: "ACC" }).click();
  await page.getByText("Select dataset").click();
  await page.getByRole("option", { name: PRODUCT.id }).click();
  await page.getByText("Select field", { exact: false }).click();
  await page.getByRole("option", { name: /temperature/ }).click();
}

test("a channel with tens of thousands of values is picked by searching", async ({
  page,
}) => {
  await openChartEditor(page);
  await selectProduct(page);

  // Opening the picker renders a capped list, not every value.
  await page.getByText("Select value").click();
  await expect(page.getByRole("option")).toHaveCount(100);
  await expect(
    page.getByText(
      `Showing 100 of ${CHANNEL_VALUE_COUNT} values. Type to narrow the list.`,
    ),
  ).toBeVisible();

  // Typing narrows the matches, with values starting with the query first.
  const search = page.getByPlaceholder("Search values...");
  await search.pressSequentially("1234");
  await expect(page.getByRole("option").first()).toHaveText("1234");
  await expect(page.getByText(/Type to narrow the list/)).toBeHidden();

  await search.pressSequentially("5");
  await expect(page.getByRole("option")).toHaveText(["12345"]);

  // Picking a value closes the picker and shows it on the trigger.
  await page.getByRole("option", { name: "12345" }).click();
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(
    page.getByRole("combobox").filter({ hasText: "12345" }),
  ).toBeVisible();
});
