// src/components/trading-dashboard/mobile/MobileTradingDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TradingDialog } from "@/components/trading-dashboard/TradingDialog";


const MobileTradingDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 right-4">
        <Button size="lg" className="rounded-full px-6" onClick={() => setOpen(true)}>
          Operar
        </Button>
      </div>

      {/* <TradingDialog {...({ open, onOpenChange: setOpen } as any)} /> */}
    </>
  );
};

export default MobileTradingDialog;
