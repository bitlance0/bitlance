"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ChartHeader from "./chart-component/ChartHeader";
import { useAlphaChart } from "./chart-component/hooks/useAlphaChart";
import { BusyOverlay, ErrorOverlay, LoadingOverlay } from "./chart-component/Overlays";

/**
 * Drop-in replacement:
 *  - Usa símbolo desde el store (no recibe `symbol` por props).
 *  - Mantiene API: <AlphaCandleChart interval="1min" />
 */
export default function AlphaCandleChart({ interval }: { interval: string }) {
  const {
    refs,
    VALID_INTERVALS,
    state: {
      chartReady, chartType, isLoading, loadingMore, error,
      currentPrice, currentTime, isChangingSymbol, selectedSymbol, currentInterval,
    },
    actions: { changeInterval, changeType, zoom, refresh },
  } = useAlphaChart(interval);

  return (
    <Card className="bg-[#0b1d37] border border-[#1e3a5f] w-full h-[550px]">
      <CardHeader>
        <ChartHeader
          symbol={selectedSymbol}
          currentTime={currentTime}
          currentPrice={currentPrice}
          currentInterval={currentInterval}
          intervals={VALID_INTERVALS}
          chartType={chartType}
          onIntervalChange={changeInterval}
          onTypeChange={changeType}
          onZoom={zoom}
          onRefresh={refresh}
          disabled={isChangingSymbol}
          isLoading={isLoading}
        />
      </CardHeader>

      <CardContent className="relative w-full h-[500px]">
        <div ref={(el) => { refs.current.container = el; }} className="absolute inset-0" />

        {!chartReady && (
          <BusyOverlay text={isChangingSymbol ? "Cambiando símbolo..." : "Inicializando gráfico..."} />
        )}

        {isLoading && <LoadingOverlay />}

        {error && (
          <ErrorOverlay
            error={error}
            onRetry={refresh}
            onDismiss={() => {/* simple dismiss: actualizar state externo si quisieras */}}
            retryDisabled={isLoading || isChangingSymbol}
          />
        )}

        {loadingMore && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-blue-900/80 border border-blue-600 rounded-lg px-3 py-2 flex items-center gap-2 text-blue-200 text-sm">
              <span className="inline-block animate-spin mr-1">⟳</span>
              {loadingMore === "backward" ? "Cargando datos históricos..." : "Cargando datos recientes..."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
