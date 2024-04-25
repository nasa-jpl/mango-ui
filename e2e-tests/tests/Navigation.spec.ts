import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("has title", async ({ page }) => {
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/MANGO/);
});

test("navigates to page", async ({ page }) => {
  // Navigate to page
  await page.getByRole("button", { name: "Datasets" }).click();

  // Confirm page configuration is loaded by examining page header
  await page.getByRole("banner").getByText("Datasets").click();
});
