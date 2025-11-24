// src/components/trading-dashboard/mobile/MobileHeader.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const MobileHeader = () => {
  const { setOpen } = useSidebar();

  return (
    <header className="flex items-center justify-between p-3 border-b bg-background">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <Image
          src="/logo.svg"
          alt="Logo"
          width={100}
          height={28}
          className="object-contain"
        />
      </div>
    </header>
  );
};

export default MobileHeader;
