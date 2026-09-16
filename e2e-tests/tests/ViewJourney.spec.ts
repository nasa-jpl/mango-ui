import { expect, test } from "@playwright/test";
import { setupApiMocks } from "../utilities/mockApi";

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
  await page.goto("/mango/");
});

test("loads the mocked view and navigates to a page", async ({ page }) => {
  // Sidebar renders the mocked page-group and page.
  await expect(page.getByRole("button", { name: "Group A" })).toBeVisible();

  // Navigate into the page.
  await page.getByRole("button", { name: "Page A" }).click();

  // Page header + section render, and the loading placeholder is gone
  // (products are mocked, so loadingInitialData resolves to false).
  await expect(page.getByRole("banner").getByText("Page A")).toBeVisible();
  await expect(page.getByText("Section One")).toBeVisible();
  await expect(page.getByText("My Chart")).toBeVisible();
});
