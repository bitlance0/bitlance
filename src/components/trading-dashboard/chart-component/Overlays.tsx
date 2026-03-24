"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, X } from "lucide-react";

export function LoadingOverlay({ text = "Consultando..." }: { text?: string }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
      <div className="flex items-center gap-2 rounded-md border border-blue-400/40 bg-[#0b1d37]/90 px-4 py-2 text-blue-100 shadow-lg">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">{text}</span>
      </div>
    </div>
  );
}

export function BusyOverlay({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 text-white">
      <span className="rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm">
        {text}
      </span>
    </div>
  );
}

export function ErrorOverlay({
  error, onRetry, onDismiss, retryDisabled,
}: { error: string; onRetry: () => void; onDismiss: () => void; retryDisabled?: boolean }) {
  const isLimit = /Límite/i.test(error);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="relative max-w-md rounded-lg border border-red-600 bg-red-900/80 p-4">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar mensaje"
          title="Cerrar"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-red-100/90 transition hover:bg-red-800/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-red-200 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">{isLimit ? "Límite de API" : "Error"}</span>
        </div>
        <p className="text-red-100 text-sm">{error}</p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="bg-red-700 hover:bg-red-600 text-white" onClick={onRetry} disabled={retryDisabled}>
            Reintentar
          </Button>
          <Button size="sm" variant="outline" className="bg-transparent border-red-600 text-red-200 hover:bg-red-800" onClick={onDismiss}>
            Usar datos en cache
          </Button>
        </div>
        {isLimit && <p className="text-red-200 text-xs mt-2">💡 Usa otra API key o espera ~1 min</p>}
      </div>
    </div>
  );
}
