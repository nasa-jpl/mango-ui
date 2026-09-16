import type { Page, Route } from "@playwright/test";

/**
 * Phase 4 E2E infrastructure: deterministic API route-mocking.
 *
 * The preview build talks to a runtime-injected `{PLACEHOLDER_API_URL}` base, so
 * every data request resolves to a URL that contains the API path fragments below.
 * We intercept them with `page.route()` and serve stable fixtures — no live backend.
 *
 * Endpoints (see src/utilities/api.ts):
 *   GET  .../ui/fetch/default-view                    -> { data: View }
 *   POST .../ui/store/default-view                    -> { }           (saveView)
 *   GET  .../missions/                                -> { data: Mission[] }
 *   GET  .../missions/{id}/products                   -> { data: Product[] }
 *   GET  .../instruments/{id}/data?...                -> DataResponse
 */

export const MISSION = { id: "GRACEFO", label: "GRACE-FO" };

export const PRODUCT = {
  available_fields: [
    {
      name: "temperature",
      supported_aggregations: [],
      unit: "K",
      type: "float",
      is_channel_id: false,
    },
    {
      name: "pressure",
      supported_aggregations: [],
      unit: "Pa",
      type: "float",
      is_channel_id: false,
    },
  ],
  available_resolutions: [
    { downsampling_factor: 1, nominal_data_interval_seconds: 0.1 },
  ],
  available_versions: ["04"],
  datasets: [
    {
      data_begin: "2022-01-01T00:00:00.000+00:00",
      data_end: "2023-01-01T00:00:00.000+00:00",
      dataset_id: "acc-alpha",
      instrument_id: "ACC",
      last_updated: "2024-01-01T00:00:00.000+00:00",
      product_id: "acc-alpha",
      version_id: "04",
    },
  ],
  description: "Accelerometer product",
  full_id: "acc-alpha",
  id: "acc-alpha",
  instruments: ["ACC"],
  mission: MISSION,
  processing_level: "1A",
  query_result_limit: 1000,
  timestamp_field: "timestamp",
};

/** A deterministic view with one page-group → page → section → chart entity. */
export function makeView() {
  return {
    config: {
      sidebarWidth: 200,
      dateRangeBounds: {
        start: "2010-12-01T00:00:00Z",
        end: "2050-12-01T00:00:00Z",
      },
    },
    home: {
      dateFormat: "long",
      id: "home",
      sections: [],
      title: "Home",
      url: "",
    },
    pageGroups: [
      {
        id: "g1",
        url: "grp",
        title: "Group A",
        pages: [
          {
            dateFormat: "long",
            id: "p1",
            url: "page-a",
            title: "Page A",
            sections: [
              {
                id: "s1",
                title: "Section One",
                enableHeader: true,
                defaultOpen: true,
                resizable: true,
                entities: [
                  {
                    id: "e1",
                    type: "chart",
                    title: "My Chart",
                    syncWithPageDateRange: true,
                    showHeader: true,
                    layers: [],
                    yAxes: [],
                  },
                ],
                layout: [{ i: "e1", w: 8, h: 7, x: 0, y: 0 }],
              },
            ],
          },
        ],
      },
    ],
    version: 1,
  };
}

const EMPTY_DATA_RESPONSE = {
  data: [],
  from_isotimestamp: "2023-06-03T00:00:00.000Z",
  to_isotimestamp: "2023-06-10T23:59:59.999Z",
};

export type ApiMocks = {
  /** Bodies of every POST to the saveView endpoint, most recent last. */
  savedViewBodies: unknown[];
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Registers all API route mocks on the page. Must be called before `page.goto()`.
 * Returns a handle whose `savedViewBodies` accumulates captured saveView POSTs.
 */
export async function setupApiMocks(
  page: Page,
  overrides: { view?: unknown; products?: unknown[] } = {},
): Promise<ApiMocks> {
  const view = overrides.view ?? makeView();
  const products = overrides.products ?? [PRODUCT];
  const mocks: ApiMocks = { savedViewBodies: [] };

  await page.route(/\/ui\/fetch\/default-view/, (route) =>
    json(route, { data: view }),
  );

  await page.route(/\/ui\/store\/default-view/, (route) => {
    const raw = route.request().postData();
    mocks.savedViewBodies.push(raw ? JSON.parse(raw) : null);
    return json(route, {});
  });

  // Products: /missions/{id}/products — must be registered so it takes priority
  // over the bare missions matcher below (Playwright matches most-recent-first).
  await page.route(/\/missions\/[^/]+\/products/, (route) =>
    json(route, { data: products }),
  );

  await page.route(/\/missions\/?(\?|$)/, (route) =>
    json(route, { data: [MISSION] }),
  );

  await page.route(/\/instruments\/[^/]+\/data/, (route) =>
    json(route, EMPTY_DATA_RESPONSE),
  );

  return mocks;
}
