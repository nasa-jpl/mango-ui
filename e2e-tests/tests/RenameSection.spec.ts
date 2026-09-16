import { expect, test } from "@playwright/test";
import { setupApiMocks } from "../utilities/mockApi";

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
  await page.goto("/mango/");
  await page.getByRole("button", { name: "Page A" }).click();
  await expect(page.getByText("Section One")).toBeVisible();
});

test("renames a section via the prompt dialog (value round-trip)", async ({
  page,
}) => {
  // Open the section's "..." menu (last button in the header controls).
  await page
    .locator("div.right-4.top-2")
    .first()
    .getByRole("button")
    .last()
    .click();
  await page.getByRole("menuitem", { name: "Rename" }).click();

  // The prompt is pre-filled with the current title; replace it.
  await expect(page.getByText("Rename Section")).toBeVisible();
  const input = page.getByPlaceholder("Enter a new name for this section");
  await expect(input).toHaveValue("Section One");
  await input.fill("Renamed Section");
  await page.getByRole("button", { name: "Okay" }).click();

  // The typed value round-trips back into the section header.
  await expect(page.getByText("Renamed Section")).toBeVisible();
  await expect(page.getByText("Section One")).toBeHidden();
});
