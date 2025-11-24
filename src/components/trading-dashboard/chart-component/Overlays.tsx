"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export function LoadingOverlay({ text = "Cargando datos..." }: { text?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/30">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {text}
      </div>
    </div>
  );
}

export function BusyOverlay({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/30">
      {text}
    </div>
  );
}

export function ErrorOverlay({
  error, onRetry, onDismiss, retryDisabled,
}: { error: string; onRetry: () => void; onDismiss: () => void; retryDisabled?: boolean }) {
  const isLimit = /Límite/i.test(error);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
      <div className="bg-red-900/80 border border-red-600 rounded-lg p-4 max-w-md">
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
