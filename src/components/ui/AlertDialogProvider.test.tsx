// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, test } from "vitest";
import {
  AlertAction,
  AlertDialogProvider,
  alertDialogReducer,
  useAlert,
  useConfirm,
  usePrompt,
} from "./AlertDialogProvider";

afterEach(() => {
  cleanup();
});

const baseState = {
  open: false,
  title: "",
  body: "",
  type: "alert" as const,
  cancelButton: "Cancel",
  actionButton: "Okay",
  cancelButtonVariant: "default" as const,
  actionButtonVariant: "default" as const,
};

describe("alertDialogReducer", () => {
  test("close only flips open to false", () => {
    const next = alertDialogReducer(
      { ...baseState, open: true, title: "keep" },
      { type: "close" },
    );
    expect(next.open).toBe(false);
    expect(next.title).toBe("keep");
  });

  test("alert opens with default 'Okay' cancel button", () => {
    const next = alertDialogReducer(baseState, {
      type: "alert",
      title: "Heads up",
    });
    expect(next.open).toBe(true);
    expect(next.type).toBe("alert");
    expect(next.cancelButton).toBe("Okay");
    expect(next.actionButton).toBe("Okay");
    expect(next.cancelButtonVariant).toBe("outline");
    expect(next.actionButtonVariant).toBe("default");
  });

  test("confirm defaults cancel to 'Cancel' and keeps custom labels/variants", () => {
    const def = alertDialogReducer(baseState, {
      type: "confirm",
      title: "Sure?",
    });
    expect(def.cancelButton).toBe("Cancel");
    expect(def.actionButton).toBe("Okay");

    const custom = alertDialogReducer(baseState, {
      type: "confirm",
      title: "Sure?",
      actionButton: "Yes",
      cancelButton: "No",
      actionButtonVariant: "destructive",
      cancelButtonVariant: "secondary",
    });
    expect(custom.actionButton).toBe("Yes");
    expect(custom.cancelButton).toBe("No");
    expect(custom.actionButtonVariant).toBe("destructive");
    expect(custom.cancelButtonVariant).toBe("secondary");
  });

  test("prompt carries defaultValue and title", () => {
    const next = alertDialogReducer(baseState, {
      type: "prompt",
      title: "Name?",
      defaultValue: "abc",
    });
    expect(next.open).toBe(true);
    expect(next.type).toBe("prompt");
    expect(next.defaultValue).toBe("abc");
    expect(next.title).toBe("Name?");
  });

  test("unknown action returns state unchanged", () => {
    const next = alertDialogReducer(baseState, {
      type: "bogus",
    } as unknown as AlertAction);
    expect(next).toBe(baseState);
  });
});

function Consumer() {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const alert = useAlert();
  const [result, setResult] = useState("(none)");
  return (
    <div>
      <button
        onClick={async () => setResult(String(await confirm("Delete it?")))}
      >
        run-confirm
      </button>
      <button
        onClick={async () =>
          setResult(
            String(
              await confirm({
                title: "Custom",
                actionButton: "Yes",
                cancelButton: "No",
              }),
            ),
          )
        }
      >
        run-confirm-obj
      </button>
      <button
        onClick={async () =>
          setResult(
            String(await prompt({ title: "Name?", defaultValue: "abc" })),
          )
        }
      >
        run-prompt
      </button>
      <button onClick={async () => setResult(String(await alert("Heads up")))}>
        run-alert
      </button>
      <div data-testid="result">{result}</div>
    </div>
  );
}

function renderConsumer() {
  return render(
    <AlertDialogProvider>
      <Consumer />
    </AlertDialogProvider>,
  );
}

describe("AlertDialogProvider", () => {
  test("confirm resolves true when the action button is clicked", async () => {
    const user = userEvent.setup();
    renderConsumer();
    await user.click(screen.getByRole("button", { name: "run-confirm" }));
    expect(await screen.findByText("Delete it?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Okay" }));
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("true"),
    );
  });

  test("confirm resolves false when cancelled", async () => {
    const user = userEvent.setup();
    renderConsumer();
    await user.click(screen.getByRole("button", { name: "run-confirm" }));
    await screen.findByText("Delete it?");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("false"),
    );
  });

  test("confirm honours custom action/cancel labels", async () => {
    const user = userEvent.setup();
    renderConsumer();
    await user.click(screen.getByRole("button", { name: "run-confirm-obj" }));
    await screen.findByText("Custom");
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("true"),
    );
  });

  test("prompt renders a pre-filled, editable input and resolves on submit", async () => {
    const user = userEvent.setup();
    renderConsumer();
    await user.click(screen.getByRole("button", { name: "run-prompt" }));
    await screen.findByText("Name?");
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveValue("abc"); // defaultValue rendered
    await user.clear(input);
    await user.type(input, "hello");
    expect(input).toHaveValue("hello"); // input is editable
    await user.click(screen.getByRole("button", { name: "Okay" }));
    // The submit path resolves the promise. NOTE: the component reads the value via
    // the legacy `event.currentTarget.prompt` named-form-control getter, which jsdom
    // does not implement, so the exact returned string cannot be asserted here — the
    // value round-trip is covered by the browser/E2E layer (Phase 4).
    await waitFor(() =>
      expect(screen.getByTestId("result")).not.toHaveTextContent("(none)"),
    );
  });

  test("prompt resolves false when cancelled", async () => {
    const user = userEvent.setup();
    renderConsumer();
    await user.click(screen.getByRole("button", { name: "run-prompt" }));
    await screen.findByText("Name?");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("false"),
    );
  });

  test("alert shows only a dismiss button and resolves false", async () => {
    const user = userEvent.setup();
    renderConsumer();
    await user.click(screen.getByRole("button", { name: "run-alert" }));
    await screen.findByText("Heads up");
    // alert has no action/submit button, only the "Okay" dismiss button
    const dialogButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent === "Okay");
    expect(dialogButtons).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Okay" }));
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("false"),
    );
  });
});
