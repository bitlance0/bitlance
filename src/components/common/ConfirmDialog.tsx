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
  destructive?: boolean; // pinta el botón primario en rojo si tu theme lo soporta
};

type ConfirmState = ConfirmOptions & {
  resolve?: (v: boolean) => void;
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
  });

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: opts.title ?? "¿Confirmar acción?",
        description: opts.description ?? "",
        confirmText: opts.confirmText ?? "Confirmar",
        cancelText: opts.cancelText ?? "Cancelar",
        destructive: opts.destructive ?? false,
        resolve,
      });
    });
  }, []);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      // si se cierra sin pulsar acción => cancelar
      state.resolve?.(false);
      setState((s) => ({ ...s, open: false, resolve: undefined }));
    }
  };

  const onConfirm = () => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: undefined }));
  };

  const onCancel = () => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: undefined }));
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}

      <AlertDialog open={state.open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
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
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : undefined
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
