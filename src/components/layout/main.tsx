// src/components/layout/main.tsx
"use client";

import { cn } from "@/lib/utils";

export default function Main({ children }: { children: React.ReactNode }) {
  return (
    <main className={cn("flex-1 flex flex-col overflow-hidden p-4 bg-background text-foreground")}>
      {children}
    </main>
  );
}
