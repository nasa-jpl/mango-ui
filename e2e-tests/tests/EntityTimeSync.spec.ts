import { expect, Page, test } from "@playwright/test";
import {
  makeView,
  MISSION,
  PRODUCT,
  setupApiMocks,
} from "../utilities/mockApi";

function makeSyncView() {
  const view = makeView();
  const chart = view.pageGroups[0].pages[0].sections[0].entities[0];
  Object.assign(chart, {
    layers: [
      {
        id: "l1",
        type: "line",
        mission: MISSION.id,
        instrument: "ACC",
        dataset: PRODUCT.id,
        version: "04",
        fields: ["temperature"],
        // Layers built in the editor carry no time window of their own.
        startTime: "",
        endTime: "",
        yAxisId: "y1",
      },
    ],
    yAxes: [{ id: "y1" }],
  });
  return view;
}

/** Records the time range of every data request the chart makes. */
function trackDataRequests(page: Page) {
  const ranges: { from: string; to: string }[] = [];
  page.on("request", (request) => {
    if (!/\/instruments\/[^/]+\/data/.test(request.url())) return;
    const params = new URL(request.url()).searchParams;
    ranges.push({
      from: params.get("from_isotimestamp") ?? "",
      to: params.get("to_isotimestamp") ?? "",
    });
  });
  return ranges;
}

async function setPageRange(page: Page, from: string, to: string) {
  const inputs = page.getByPlaceholder("Ex: 2030-12-01T00:00:00");
  await inputs.nth(0).fill(from);
  await inputs.nth(0).press("Enter");
  await inputs.nth(1).fill(to);
  await inputs.nth(1).press("Enter");
}

async function toggleSyncFromMenu(page: Page) {
  const chart = page.locator(".chart").first();
  await chart.hover();
  // Header buttons: zoom out, zoom in, more options (⋮).
  await chart.locator(".right-content button").last().click();
  const item = page.getByRole("menuitemcheckbox", {
    name: "Sync with page time range",
  });
  await expect(item).toBeVisible();
  await item.click();
}

test("a chart's page time range sync can be toggled from its ⋮ menu", async ({
  page,
}) => {
  const mocks = await setupApiMocks(page, { view: makeSyncView() });
  const ranges = trackDataRequests(page);
  const lastFrom = () => ranges.at(-1)?.from.slice(0, 10);

  await page.goto("/mango/");
  await page.getByRole("button", { name: "Page A" }).click();
  await expect(page.getByRole("banner").getByText("Page A")).toBeVisible();

  // Synced (the default): the chart follows the page range.
  await setPageRange(page, "2023-06-05T00:00:00", "2023-06-06T00:00:00");
  await expect.poll(lastFrom).toBe("2023-06-05");

  // Unsync from the ⋮ menu: the chart keeps showing the same window...
  const requestsBeforeUnsync = ranges.length;
  await toggleSyncFromMenu(page);
  await page.waitForTimeout(1000);
  expect(
    ranges
      .slice(requestsBeforeUnsync)
      .every((r) => r.from.startsWith("2023-06-05")),
  ).toBe(true);

  // ...and no longer follows page range changes.
  const requestsBefore = ranges.length;
  await setPageRange(page, "2023-07-01T00:00:00", "2023-07-02T00:00:00");
  await page.waitForTimeout(1000);
  expect(
    ranges.slice(requestsBefore).every((r) => r.from.startsWith("2023-06-05")),
  ).toBe(true);

  // The editor reflects the menu toggle.
  const chart = page.locator(".chart").first();
  await chart.hover();
  await chart.locator(".right-content button").last().click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Sync with page time range" }),
  ).not.toBeChecked();
  await expect(
    page.getByText(
      "Keeps its current time range when the page time range changes.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  // Re-sync from the menu: the chart follows the current page range again.
  await toggleSyncFromMenu(page);
  await expect.poll(lastFrom).toBe("2023-07-01");

  // Unsync once more and save: the flag and the captured range reach the
  // stored view.
  await toggleSyncFromMenu(page);
  await page.getByRole("button", { name: /Save View Changes/ }).click();
  await page
    .getByPlaceholder("Enter password...")
    .fill("This will be a secret");
  await page.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => mocks.savedViewBodies.length).toBeGreaterThan(0);
  const body = mocks.savedViewBodies.at(-1) as {
    data: ReturnType<typeof makeView>;
  };
  const savedChart = body.data.pageGroups[0].pages[0].sections[0]
    .entities[0] as {
    syncWithPageDateRange: boolean;
    dateRange?: { start: string };
  };
  expect(savedChart.syncWithPageDateRange).toBe(false);
  expect(savedChart.dateRange?.start.slice(0, 10)).toBe("2023-07-01");
});
