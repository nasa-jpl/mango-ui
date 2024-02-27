import { expect, test } from "@playwright/test";
import assert from "assert";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("has title", async ({ page }) => {
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/GMAT/);
});

// test("get started link", async ({ page }) => {
//   // Click the get started link.
//   await page.getByRole("link", { name: "Get started" }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(
//     page.getByRole("heading", { name: "Installation" })
//   ).toBeVisible();
// });

test("page date-time selection yields expected API response", async ({ page }) => {
  /**
   * Test to confirm page date-time selection results in valid API
   * response containing data for the selected date-time range.
   */
  let startDateTime = "2022-03-02T00:01"
  let endDateTime = "2022-03-02T00:02"

  // Navigate to page containing charts
  await page.getByRole('button', { name: 'Coalesced Acceleration' }).click();

  /** 
   * API requests should be initiated when either the start or end page 
   * datepicker changes. We only need to look at the second one and 
   * make sure the date range for the data in the response matches the 
   * range defined by the page datepickers.
   */
  page.fill("id=page-datetime-start", startDateTime)
  await page.waitForLoadState('networkidle');

  const [_, response] = await Promise.all([
    await page.fill("id=page-datetime-end", endDateTime),
    page.waitForResponse(response => {
      return response.url().includes('/missions/GRACEFO/datasets/') && response.status() === 200;
    })
  ]);
  
  // Assert API response date-time range for requested data matches page date-time range
  const data = await response.json();
  assert(data["from_isotimestamp"].substring(0,16) == startDateTime && data["to_isotimestamp"].substring(0,16) == endDateTime)
});
