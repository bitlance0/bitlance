// src/components/ui/ThemeSwitcher.tsx
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeSwitcherProps {
  expandedWidth?: string; // ancho cuando se expande, por ejemplo "w-36"
}

export default function ThemeSwitcher({ expandedWidth = "w-36" }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme") as "dark" | "light" | null;
      const initial =
        stored ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light");

      setTheme(initial);
      applyTheme(initial);
    } catch (e) {
      console.error("Error al leer el tema:", e);
    }
  }, []);

  const applyTheme = (newTheme: "dark" | "light") => {
    const root = document.documentElement;
    root.setAttribute("data-theme", newTheme);
    root.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = () => {
    if (!theme) return;
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (!theme) return null;

  return (
    <button
      onClick={toggleTheme}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "group flex items-center h-12 px-3 rounded-2xl",
        "bg-[var(--card)] text-[var(--amarillo-principal)]",
        "hover:bg-[var(--amarillo-principal)] hover:text-black",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        isExpanded ? `${expandedWidth} justify-start gap-3` : "w-12 justify-center"
      )}
    >
      {/* Icono */}
      <div className="flex items-center justify-center w-6 h-6">
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </div>

      {/* Texto que aparece al expandir */}
      {isExpanded && (
        <span
          className="text-sm font-medium transition-opacity duration-300 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
        </span>
      )}
    </button>
  );
}
