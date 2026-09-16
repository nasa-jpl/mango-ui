import { expect, Page, test } from "@playwright/test";
import { setupApiMocks } from "../utilities/mockApi";

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
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

test("switches entity type via the Radix Select and saves an edited title", async ({
  page,
}) => {
  await openChartEditor(page);

  // Title is pre-filled from the entity. The date-range inputs carry a
  // placeholder; the Title input is the only one without one.
  const title = page.locator("input:not([placeholder])").first();
  await expect(title).toHaveValue("My Chart");

  // Edit the title (preserved across an entity-type change).
  await title.fill("Renamed Entity");

  // Entity-type Select is the only combobox while there are no products.
  const entityType = page.getByRole("combobox").first();
  await expect(entityType).toContainText("Chart");
  await entityType.click();
  await page.getByRole("option", { name: "Table" }).click();
  await expect(entityType).toContainText("Table");

  // Persist via Done.
  await page.getByRole("button", { name: "Done" }).click();

  // Editor closes and the saved entity is reflected on the page.
  await expect(page.getByText("Edit Entity")).toBeHidden();
  await expect(page.getByText("Renamed Entity")).toBeVisible();
});

test("selects a product through the mission/instrument/dataset/field/version pickers", async ({
  page,
}) => {
  await openChartEditor(page);

  await page.getByRole("button", { name: /Add Product/ }).click();

  // Radix Selects: open by clicking the placeholder, then pick the option.
  await page.getByText("Select mission").click();
  await page.getByRole("option", { name: "GRACE-FO" }).click();

  await page.getByText("Select instrument").click();
  await page.getByRole("option", { name: "ACC" }).click();

  await page.getByText("Select dataset").click();
  await page.getByRole("option", { name: "acc-alpha" }).click();

  // Field picker is a cmdk Command in a Popover.
  await page.getByText("Select field", { exact: false }).click();
  await page.getByRole("option", { name: /temperature/ }).click();

  await page.getByText("Select version").click();
  await page.getByRole("option", { name: "04" }).click();

  // The field trigger now reflects the chosen field.
  await expect(page.getByText("temperature")).toBeVisible();
});
