"use client";

import { useState } from "react";
import { Suspense } from "react";

import HeroSection from "@/components/landing/HeroSection";
import AnywhereSection from "@/components/landing/AnywhereSection";
import LeverageSection from "@/components/landing/LeverageSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import NewsSection from "@/components/landing/NewsSection";
import MarketSection from "@/components/landing/MarketSection";

import { MarketKey } from "@/lib/marketsLanding";
import type {
  MarketItem,
  RenderedMarketRow,
} from "@/lib/marketTypes";




export default function LandingPage() {
  // ✅ SOLO mercados válidos para la API
  const [mainMarket, setMainMarket] = useState<MarketKey>("indices");

  const renderRow = (item: MarketItem) => ({
    symbol: item.symbol,
    price: item.price,
    date: new Date(item.latestTradingDay).toLocaleDateString(),
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <HeroSection />
      <NewsSection />
      <AnywhereSection />
      <LeverageSection />

      {/* 🔹 Sección de mercados */}
      <section
        id="markets"
        className="py-20 bg-card text-card-foreground border-t border-border"
      >
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Explora los Mercados
          </h2>

          <p className="text-base lg:text-lg font-light opacity-90 max-w-2xl mx-auto">
            Visualiza en tiempo real los principales índices, criptomonedas,
            divisas y materias primas.
          </p>

          <Suspense fallback={<div>Cargando mercados...</div>}>
            <MarketSection
              title={mainMarket}
              renderRow={renderRow}
              onMarketChange={setMainMarket}
            />
          </Suspense>
        </div>
      </section>

      <TestimonialsSection />

      <footer className="mt-auto py-6 border-t border-border bg-card text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} BitLance — Todos los derechos reservados.
      </footer>
    </div>
  );
}
