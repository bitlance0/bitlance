// src/components/ui/HeaderButton.tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HeaderButtonProps {
  href?: string;
  icon: ReactNode;
  text?: string;                   // Texto del tooltip
  onClick?: () => void;
  tooltipPosition?: "top" | "bottom" | "left" | "right"; // Posición del tooltip
}

export default function HeaderButton({
  href,
  icon,
  text,
  onClick,
  tooltipPosition = "right", // default
}: HeaderButtonProps) {
  // Definir clases dinámicas según la posición
  const tooltipClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[tooltipPosition];

  const content = (
    <div
      className={cn(
        "group relative flex items-center justify-center h-12 w-12 rounded-lg",
        "bg-[var(--card)] text-[var(--amarillo-principal)]",
        "hover:bg-[var(--amarillo-principal)] hover:text-black",
        "transition-all duration-300 cursor-pointer select-none"
      )}
      onClick={onClick}
      title={text} // tooltip nativo opcional
    >
      {/* Icono */}
      <div className="flex items-center justify-center w-6 h-6">{icon}</div>

      {/* Tooltip posicionado según tooltipPosition */}
      {text && (
        <span
          className={cn(
            "absolute rounded-md bg-[var(--card)] px-2 py-1 text-xs font-bold shadow-md",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap",
            "text-[var(--text-color)] border border-[var(--border)]",
            tooltipClass
          )}
        >
          {text}
        </span>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
