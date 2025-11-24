// src/modules/home/ui/views/home/home-view.tsx
'use client';

import TradingDashboard from "@/components/TradingDashboard";

export const HomeView = () => {
  return (
    <div className="flex h-[90vh] text-yellow-300 w-full">
      <TradingDashboard />
    </div>
  );
}
