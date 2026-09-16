// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { config } from "../../../config";
import { View } from "../../../types/view";
import { Sidebar } from "./Sidebar";

// SaveViewModal (rendered by Sidebar) imports saveView; stub so no real fetch.
vi.mock("../../../utilities/api", () => ({ saveView: vi.fn() }));

afterEach(() => cleanup());

function makeView(): View {
  return {
    version: 1,
    home: { id: "h", title: "Home", url: "", sections: [] },
    config: { sidebarWidth: 200 },
    pageGroups: [
      {
        id: "g1",
        url: "grp",
        title: "Group A",
        pages: [{ id: "pg1", url: "p1", title: "Page One", sections: [] }],
      },
    ],
  } as unknown as View;
}

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const onViewSaved = vi.fn();
  render(
    <MemoryRouter>
      <Sidebar onViewSaved={onViewSaved} {...props} />
    </MemoryRouter>,
  );
  return { onViewSaved };
}

test("shows a Loading placeholder and the static nav links when no view is provided", () => {
  renderSidebar({ view: undefined });
  expect(screen.getByText("Loading")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Home/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Products/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Manage/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Help/ })).toBeInTheDocument();
});

test("renders page groups and their pages as nav links with correct hrefs", () => {
  renderSidebar({ view: makeView() });
  expect(screen.getByText("Group A")).toBeInTheDocument();
  const pageLink = screen.getByRole("link", { name: /Page One/ });
  expect(pageLink).toHaveAttribute("href", "/view/grp/p1");
  expect(screen.queryByText("Loading")).not.toBeInTheDocument();
});

test("shows the Save View Changes button when saving is enabled", () => {
  renderSidebar({ view: makeView(), viewSavingEnabled: true });
  expect(
    screen.getByRole("button", { name: /Save View Changes/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /View up-to-date/ }),
  ).not.toBeInTheDocument();
});

test("shows a disabled up-to-date button when saving is disabled", () => {
  renderSidebar({ view: makeView(), viewSavingEnabled: false });
  const upToDate = screen.getByRole("button", { name: /View up-to-date/ });
  expect(upToDate).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: /Save View Changes/ }),
  ).not.toBeInTheDocument();
});

test("opens the Save View modal when Save View Changes is clicked", async () => {
  const user = userEvent.setup();
  renderSidebar({ view: makeView(), viewSavingEnabled: true });
  expect(screen.queryByPlaceholderText("Enter password...")).toBeNull();
  await user.click(screen.getByRole("button", { name: /Save View Changes/ }));
  expect(
    await screen.findByPlaceholderText("Enter password..."),
  ).toBeInTheDocument();
});

test("Help links to the docs endpoint in a new tab", () => {
  renderSidebar({ view: makeView() });
  const help = screen.getByRole("link", { name: /Help/ });
  expect(help).toHaveAttribute("href", config.endpoints.docs);
  expect(help).toHaveAttribute("target", "_blank");
});
