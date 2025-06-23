import { test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  //await page.goto("/mango/");
  await page.goto("/mango/", { waitUntil: "networkidle", timeout: 30000 });
});

// test("has title", async ({ page }) => {
//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/MANGO/);
// });

test("navigates to page", async ({ page }) => {
  page.on("requestfailed", (request) => {
    console.log("FAILED:", request.url(), ":", request.failure()?.errorText);
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      console.log(`ERROR ${response.status()}: ${response.url()}`);
    }
  });

  // Navigate to page
  await page.getByRole("button", { name: "Products" }).click();

  // Confirm page configuration is loaded by examining page header
  await page.getByRole("banner").getByText("Products").click();
});
