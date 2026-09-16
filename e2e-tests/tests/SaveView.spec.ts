import { expect, test } from "@playwright/test";
import { setupApiMocks } from "../utilities/mockApi";

const PASSWORD = "This will be a secret";

test("saving a mutated view POSTs the updated view to the store endpoint", async ({
  page,
}) => {
  const mocks = await setupApiMocks(page);
  await page.goto("/mango/");
  await page.getByRole("button", { name: "Page A" }).click();
  await expect(page.getByRole("banner").getByText("Page A")).toBeVisible();

  // Mutate the view: add a section via the page Add menu.
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("menuitem", { name: "Add Section" }).click();
  await expect(page.getByText("New Section")).toBeVisible();

  // The Sidebar now offers to save the changed view.
  await page.getByRole("button", { name: /Save View Changes/ }).click();

  // Enter the admin password and save.
  await page.getByPlaceholder("Enter password...").fill(PASSWORD);
  await page.getByRole("button", { name: "Save" }).click();

  // The store endpoint received the updated view including the new section.
  await expect.poll(() => mocks.savedViewBodies.length).toBeGreaterThan(0);
  const body = mocks.savedViewBodies.at(-1) as {
    data: { pageGroups: { pages: { sections: { title: string }[] }[] }[] };
  };
  const sections = body.data.pageGroups[0].pages[0].sections;
  expect(sections.map((s) => s.title)).toContain("New Section");
});
