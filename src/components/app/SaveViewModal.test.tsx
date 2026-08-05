// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { View } from "../../types/view";
import { saveView } from "../../utilities/api";
import { SaveViewModal } from "./SaveViewModal";

vi.mock("../../utilities/api", () => ({
  saveView: vi.fn(),
}));

const mockSaveView = vi.mocked(saveView);
const PASSWORD = "This will be a secret";
const view = { id: "v1" } as unknown as View;

beforeEach(() => {
  mockSaveView.mockReset();
  mockSaveView.mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<typeof saveView>>,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderModal(
  overrides: Partial<Parameters<typeof SaveViewModal>[0]> = {},
) {
  const onClose = vi.fn();
  const onSave = vi.fn();
  render(
    <SaveViewModal
      open
      view={view}
      onClose={onClose}
      onSave={onSave}
      {...overrides}
    />,
  );
  return { onClose, onSave };
}

test("renders nothing when closed", () => {
  renderModal({ open: false });
  expect(screen.queryByText("Save View Changes")).not.toBeInTheDocument();
});

test("shows the dialog with a disabled Save button when open", () => {
  renderModal();
  expect(screen.getByText("Save View Changes")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("keeps Save disabled for an incorrect password", async () => {
  const user = userEvent.setup();
  renderModal();
  await user.type(screen.getByPlaceholderText("Enter password..."), "nope");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("enables Save once the correct password is entered (case-insensitive)", async () => {
  const user = userEvent.setup();
  renderModal();
  await user.type(
    screen.getByPlaceholderText("Enter password..."),
    PASSWORD.toUpperCase(),
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("saves the view and closes when Save is clicked with the correct password", async () => {
  const user = userEvent.setup();
  const { onSave, onClose } = renderModal();
  await user.type(screen.getByPlaceholderText("Enter password..."), PASSWORD);
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(mockSaveView).toHaveBeenCalledWith(view));
  expect(onSave).toHaveBeenCalledWith(view);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("submits on Enter when the password is correct", async () => {
  const user = userEvent.setup();
  const { onSave } = renderModal();
  await user.type(
    screen.getByPlaceholderText("Enter password..."),
    `${PASSWORD}{Enter}`,
  );
  await waitFor(() => expect(mockSaveView).toHaveBeenCalledWith(view));
  expect(onSave).toHaveBeenCalledWith(view);
});

test("shows an error and does not call onSave/onClose when saving fails", async () => {
  mockSaveView.mockRejectedValueOnce(new Error("boom"));
  const user = userEvent.setup();
  const { onSave, onClose } = renderModal();
  await user.type(screen.getByPlaceholderText("Enter password..."), PASSWORD);
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(/Error saving view: boom/),
  ).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test("Cancel closes without saving", async () => {
  const user = userEvent.setup();
  const { onClose } = renderModal();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(mockSaveView).not.toHaveBeenCalled();
});
