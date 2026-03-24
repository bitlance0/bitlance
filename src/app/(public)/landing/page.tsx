// src/app/(public)/landing/page.tsx
"use client";

import { Suspense, useCallback, useState } from "react";

import HeroSection from "@/components/landing/HeroSection";
import AnywhereSection from "@/components/landing/AnywhereSection";
import LeverageSection from "@/components/landing/LeverageSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import NewsSection from "@/components/landing/NewsSection";
import MarketSection from "@/components/landing/MarketSection";
import MarketSearchBar, {
  type MarketSearchItem,
} from "@/components/landing/MarketSearchBar";

import type { MarketItem } from "@/lib/marketTypes";

const VALID_MARKETS = [
  "indices",
  "crypto",
  "commodities",
  "acciones",
  "forex",
  "funds",
] as const;
type LandingMarket = (typeof VALID_MARKETS)[number];

type MarketSelection = {
  market: LandingMarket;
  region: string;
  exchange: string;
  symbol: string;
};

export default function LandingPage() {
  const [mainMarket, setMainMarket] = useState<LandingMarket>("indices");
  const [selection, setSelection] = useState<MarketSelection | null>(null);

  const renderRow = (item: MarketItem) => ({
    symbol: item.symbol,
    price: item.price,
    date: new Date(item.latestTradingDay).toLocaleDateString(),
  });

  const handleMarketChange = useCallback((market: string) => {
    if (VALID_MARKETS.includes(market as LandingMarket)) {
      setMainMarket(market as LandingMarket);
    }
  }, []);

  const handleSearchSelection = useCallback((item: MarketSearchItem) => {
    const selectedMarket = item.market as LandingMarket;
    if (!VALID_MARKETS.includes(selectedMarket)) return;

    setMainMarket(selectedMarket);
    setSelection({
      market: selectedMarket,
      region: item.region || item.scope || "GLOBAL",
      exchange: item.exchange,
      symbol: item.symbol,
    });

    requestAnimationFrame(() => {
      document.getElementById("markets-table")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <HeroSection />
      <NewsSection />
      <AnywhereSection />
      <LeverageSection />

      <section
        id="markets"
        className="py-20 bg-card text-card-foreground border-t border-border"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Explora los Mercados
          </h2>

          <p className="text-base lg:text-lg font-light opacity-90 max-w-2xl mx-auto">
            Visualiza en tiempo real los principales indices, criptomonedas,
            divisas y materias primas.
          </p>

          <MarketSearchBar onSelect={handleSearchSelection} />

          <Suspense fallback={<div>Cargando mercados...</div>}>
            <MarketSection
              title={mainMarket}
              selection={selection}
              renderRow={renderRow}
              onMarketChange={handleMarketChange}
            />
          </Suspense>
        </div>
      </section>

      <TestimonialsSection />

      <footer className="mt-auto py-6 border-t border-border bg-card text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} BitLance - Todos los derechos reservados.
      </footer>
    </div>
  );
}
