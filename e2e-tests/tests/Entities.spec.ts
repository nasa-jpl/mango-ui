import { test } from "@playwright/test";
import assert from "assert";

test.beforeEach(async ({ page }) => {
  await page.goto("/mango/");
});

test("page date-time selection yields expected API response", async ({
  page,
}) => {
  test.skip(!!process.env.CI, "Skipped in CI due lack of API access");

  /**
   * Test to confirm page date-time selection results in valid API
   * response containing data for the selected date-time range.
   */
  const startDateTime = "2022-03-02T00:01";
  const endDateTime = "2022-03-02T00:02";

  // Navigate to page containing charts
  await page.getByRole("button", { name: "ACC1A" }).click();

  /**
   * API requests should be initiated when either the start or end page
   * datepicker changes. We only need to look at the second one and
   * make sure the date range for the data in the response matches the
   * range defined by the page datepickers.
   */
  page.fill("id=page-datetime-start", startDateTime);
  await page.waitForLoadState("networkidle");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, response] = await Promise.all([
    await page.fill("id=page-datetime-end", endDateTime),
    page.waitForResponse(
      (response) => {
        return (
          response.url().includes("/missions/GRACEFO/datasets/") &&
          response.status() === 200
        );
      },
      { timeout: 10000 }
    ),
  ]);

  // Assert API response date-time range for requested data matches page date-time range
  const data = await response.json();
  assert(
    data["from_isotimestamp"].substring(0, 16) === startDateTime &&
      data["to_isotimestamp"].substring(0, 16) === endDateTime
  );
});
