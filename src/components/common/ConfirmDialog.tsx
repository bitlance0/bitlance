"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve?: (value: boolean) => void;
  open: boolean;
};

const ConfirmCtx = React.createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false)
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    confirmClassName: undefined,
  });

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: opts.title ?? "Confirmar accion",
        description: opts.description ?? "",
        confirmText: opts.confirmText ?? "Confirmar",
        cancelText: opts.cancelText ?? "Cancelar",
        confirmClassName: opts.confirmClassName,
        destructive: opts.destructive ?? false,
        resolve,
      });
    });
  }, []);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      state.resolve?.(false);
      setState((prev) => ({ ...prev, open: false, resolve: undefined }));
    }
  };

  const onConfirm = () => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, open: false, resolve: undefined }));
  };

  const onCancel = () => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, open: false, resolve: undefined }));
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}

      <AlertDialog open={state.open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--color-text)]">
              {state.title}
            </AlertDialogTitle>
            {state.description ? (
              <AlertDialogDescription className="text-[var(--color-text-muted)]">
                {state.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>
              {state.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className={
                state.destructive
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : state.confirmClassName
              }
            >
              {state.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  return React.useContext(ConfirmCtx);
}
