import { expect, test } from "@playwright/test";
import { setupApiMocks } from "../utilities/mockApi";

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
  await page.goto("/mango/");
  await page.getByRole("button", { name: "Page A" }).click();
  await expect(page.getByRole("banner").getByText("Page A")).toBeVisible();
});

test("the date-range picker rejects an invalid typed date and accepts a valid one", async ({
  page,
}) => {
  const from = page
    .getByPlaceholder("Ex: 2030-12-01T00:00:00")
    .first();

  // Invalid input surfaces a validation error on Enter.
  await from.fill("not-a-date");
  await from.press("Enter");
  await expect(page.getByText("Invalid start date")).toBeVisible();

  // A valid date within bounds clears the error.
  await from.fill("2023-06-05T00:00:00");
  await from.press("Enter");
  await expect(page.getByText("Invalid start date")).toBeHidden();
});
