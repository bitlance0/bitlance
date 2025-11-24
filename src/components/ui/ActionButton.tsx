// src/components/ui/ActionButton.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  href?: string; // 👈 ahora es opcional
  label: string;
  icon?: React.ReactNode;
  expandedWidth?: string;
  bgColor?: string;
  textColor?: string;
  hoverBg?: string;
  hoverText?: string;
  expandDirection?: "left" | "right";
  onClick?: (e: React.MouseEvent) => void; // 👈 nuevo handler
}

export default function ActionButton({
  href,
  label,
  icon,
  expandedWidth = "w-36",
  bgColor = "bg-[var(--card)]",
  textColor = "text-[var(--amarillo-principal)]",
  hoverBg = "hover:bg-[var(--amarillo-principal)]",
  hoverText = "hover:text-black",
  expandDirection = "right",
  onClick,
}: ActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const baseClasses = cn(
    "absolute top-0 z-20 group flex items-center h-12 px-3 rounded-2xl overflow-hidden transition-all duration-300 shadow-md",
    bgColor,
    textColor,
    hoverBg,
    hoverText,
    expandDirection === "left"
      ? "right-0 justify-end origin-right"
      : "left-0 justify-start origin-left",
    isExpanded ? `${expandedWidth} justify-start gap-3` : "w-12 justify-center"
  );

  const content = (
    <>
      <div className="flex items-center justify-center w-6 h-6">{icon}</div>
      {isExpanded && (
        <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {label}
        </span>
      )}
    </>
  );

  // 👇 si hay href, usa Link. Si no, usa button.
  const Wrapper = href
    ? (props: Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href'>) => <Link href={href} {...props} />
    : (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />;
  return (
    <div className="relative w-12 h-12 overflow-visible flex justify-end">
      <Wrapper
        onClick={onClick}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={baseClasses}
      >
        {content}
      </Wrapper>
    </div>
  );
}
