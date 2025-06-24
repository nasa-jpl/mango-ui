// Adapted from https://gist.github.com/alexanderson1993/623bf0324f740ec4e33f33b59487dda7
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
} from "@nasa-jpl/stellar-react";
import * as React from "react";

export const AlertDialogContext = React.createContext<
  (
    params: AlertAction
  ) => Promise<
    AlertAction["type"] extends "alert" | "confirm" ? boolean : null | string
  >
>(() => null!);

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type AlertAction =
  | {
      body?: string;
      cancelButton?: string;
      cancelButtonVariant?: ButtonVariant;
      title: string;
      type: "alert";
    }
  | {
      actionButton?: string;
      actionButtonVariant?: ButtonVariant;
      body?: string;
      cancelButton?: string;
      cancelButtonVariant?: ButtonVariant;
      title: string;
      type: "confirm";
    }
  | {
      actionButton?: string;
      actionButtonVariant?: ButtonVariant;
      body?: string;
      cancelButton?: string;
      cancelButtonVariant?: ButtonVariant;
      defaultValue?: string;
      inputProps?: React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >;
      title: string;
      type: "prompt";
    }
  | { type: "close" };

interface AlertDialogState {
  actionButton: string;
  actionButtonVariant: ButtonVariant;
  body: string;
  cancelButton: string;
  cancelButtonVariant: ButtonVariant;
  defaultValue?: string;
  inputProps?: React.PropsWithoutRef<
    React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >
  >;
  open: boolean;
  title: string;
  type: "alert" | "confirm" | "prompt";
}

export function alertDialogReducer(
  state: AlertDialogState,
  action: AlertAction
): AlertDialogState {
  switch (action.type) {
    case "close":
      return { ...state, open: false };
    case "alert":
    case "confirm":
    case "prompt":
      return {
        ...state,
        open: true,
        ...action,
        cancelButton:
          action.cancelButton || (action.type === "alert" ? "Okay" : "Cancel"),
        actionButton:
          ("actionButton" in action && action.actionButton) || "Okay",
        cancelButtonVariant: action.cancelButtonVariant || "outline",
        actionButtonVariant:
          ("actionButtonVariant" in action && action.actionButtonVariant) ||
          "default",
      };
    default:
      return state;
  }
}

export function AlertDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(alertDialogReducer, {
    open: false,
    title: "",
    body: "",
    type: "alert",
    cancelButton: "Cancel",
    actionButton: "Okay",
    cancelButtonVariant: "default",
    actionButtonVariant: "default",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolveRef = React.useRef<(tf: any) => void>();

  function close() {
    dispatch({ type: "close" });
    resolveRef.current?.(false);
  }

  function confirm(value?: string) {
    dispatch({ type: "close" });
    resolveRef.current?.(value ?? true);
  }

  const dialog = React.useCallback(async <T extends AlertAction>(params: T) => {
    dispatch(params);

    return new Promise<
      T["type"] extends "alert" | "confirm" ? boolean : null | string
    >((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  return (
    <AlertDialogContext.Provider value={dialog}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) close();
          return;
        }}
      >
        <AlertDialogContent asChild>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              confirm(event.currentTarget.prompt?.value);
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{state.title}</AlertDialogTitle>
              {state.body ? (
                <AlertDialogDescription>{state.body}</AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            {state.type === "prompt" && (
              <Input
                name="prompt"
                defaultValue={state.defaultValue}
                {...state.inputProps}
              />
            )}
            <AlertDialogFooter>
              <Button
                type="button"
                onClick={close}
                variant={state.cancelButtonVariant}
                size="lg"
              >
                {state.cancelButton}
              </Button>
              {state.type === "alert" ? null : (
                <Button
                  type="submit"
                  size="lg"
                  variant={state.actionButtonVariant}
                >
                  {state.actionButton}
                </Button>
              )}
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </AlertDialogContext.Provider>
  );
}
type Params<T extends "alert" | "confirm" | "prompt"> =
  | Omit<Extract<AlertAction, { type: T }>, "type">
  | string;

export function useConfirm() {
  const dialog = React.useContext(AlertDialogContext);

  return React.useCallback(
    (params: Params<"confirm">) => {
      return dialog({
        ...(typeof params === "string" ? { title: params } : params),
        type: "confirm",
      });
    },
    [dialog]
  );
}
export function usePrompt() {
  const dialog = React.useContext(AlertDialogContext);

  return (params: Params<"prompt">) =>
    dialog({
      ...(typeof params === "string" ? { title: params } : params),
      type: "prompt",
    });
}
export function useAlert() {
  const dialog = React.useContext(AlertDialogContext);
  return (params: Params<"alert">) =>
    dialog({
      ...(typeof params === "string" ? { title: params } : params),
      type: "alert",
    });
}
