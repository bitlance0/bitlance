// src/app/(public)/landing/page.tsx
"use client";

import { useEffect, useState } from "react";
import HeroSection from "@/components/landing/HeroSection";
import AnywhereSection from "@/components/landing/AnywhereSection";
import LeverageSection from "@/components/landing/LeverageSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import { Suspense } from "react";
import MarketSection from "@/components/landing/MarketSection";
import { MARKETS } from "@/config/markets";
import NewsSection from "@/components/landing/NewsSection";

// 🔹 Define la interfaz para los items del mercado
interface MarketItem {
  Name?: string;
  Symbol?: string;
  Last?: number | string;
  High?: number | string;
  Low?: number | string;
  Chg?: number | string;
  ChgPct?: number | string;
  Time?: string;
  Url?: string;
}

// 🔹 Interfaz para el objeto retornado por renderRow
interface RenderedMarketRow {
  name: string;
  last: string | number;
  high: string | number;
  low: string | number;
  chg: string | number;
  chgPct: string | number;
  time: string;
  url: string;
}

// 🔹 Define el tipo para la configuración del mercado
type MarketConfig = {
  buttons: string[];
  getUrlMarkets: () => string;
  // Agrega aquí las propiedades específicas que necesites según tus mercados
  majors?: { getUrlMarkets: () => string };
  indices_futures?: { getUrlMarkets: () => string };
  americas?: { getUrlMarkets: () => string };
  europe?: { getUrlMarkets: () => string };
  asia_pacific?: { getUrlMarkets: () => string };
  middle_east?: { getUrlMarkets: () => string };
  africa?: { getUrlMarkets: () => string };
  trending_stocks?: { getUrlMarkets: () => string };
  most_active?: { getUrlMarkets: () => string };
  top_gainers?: { getUrlMarkets: () => string };
  top_losers?: { getUrlMarkets: () => string };
  // Agrega otras propiedades según sea necesario
};

// 🔹 Tipo para las claves de MARKETS
type MarketKey = keyof typeof MARKETS;

export default function LandingPage() {
  // 🔹 Estado del mercado principal con tipos específicos
  const [mainMarket, setMainMarket] = useState<MarketKey>("Indices");
  const [marketConfig, setMarketConfig] = useState<MarketConfig>(MARKETS["Indices"] as MarketConfig);

  // 🔹 Aseguramos sincronía del estado tras hidratación
  useEffect(() => {
    const config = MARKETS[mainMarket];
    if (config) {
      setMarketConfig(config as MarketConfig);
    }
  }, [mainMarket]);

  // 🔹 Mapeo estable de datos CON TIPO DEFINIDO
  const renderRow = (item: MarketItem): RenderedMarketRow => ({
    name: item?.Name ?? item?.Symbol ?? "—",
    last: item?.Last ?? "-",
    high: item?.High ?? "-",
    low: item?.Low ?? "-",
    chg: item?.Chg ?? "-",
    chgPct: item?.ChgPct ?? "-",
    time: item?.Time ?? "-",
    url: item?.Url ?? "",
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

          {/* 🔹 MarketSection aislado en cliente */}
          <Suspense fallback={<div>Cargando mercados...</div>}>
            {marketConfig && (
              <MarketSection
                title={mainMarket}
                buttons={marketConfig.buttons}
                getUrl={marketConfig.getUrlMarkets}
                renderRow={renderRow}
                onMarketChange={setMainMarket}
              />
            )}
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