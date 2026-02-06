//src/components/layout/header-public.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ActionButton from "@/components/ui/ActionButton";
import { LogIn } from "lucide-react";
// import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import Image from "next/image";
import { Menu, X } from "lucide-react";

export default function HeaderPublic() {
  const pathname = usePathname();

  // ✅ Unificamos el estado para manejar tanto el menú hamburguesa como el submenú “Legal”
  const [isOpen, setIsOpen] = useState<string | boolean>(false);

  // 🔹 Cierra el submenú Legal al hacer clic en cualquier enlace
  const handleLegalLinkClick = () => {
    setIsOpen(false);
  };

  const navItems = [
    { name: "¿Por qué elegirnos?", href: "/why-us" },
    { name: "Tipos de Cuentas", href: "/types-of-accounts" },
    { name: "Plataforma de Trading", href: "/sign-in" },
    { name: "Conocimiento de Trading", href: "/trading-knowledge" },
    { name: "Trabaje con nosotros", href: "/careers" },
    { name: "Soporte", href: "/support" },
  ];

  return (
    // <header className="fixed top-0 left-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md">
    <header
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* 🟡 Logo */}
        <div className="flex items-center gap-2">
          <Link href="/landing" className="flex items-center gap-2 font-bold text-xl">
            <Image src="/logo.png" alt="Logo" width={60} height={60} />
            
            {/* Texto visible solo en pantallas grandes */}
            <h1
              className="hidden xl:block text-2xl font-bold text-center"
              style={{ color: "var(--amarillo-principal)" }}
            >
              BitLance
            </h1>
          </Link>
        </div>


        {/* 🔹 Navegación en escritorio */}
        <nav className="hidden md:flex gap-8 items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-[var(--amarillo-principal)] ${
                pathname === item.href
                  ? "text-[var(--amarillo-principal)] font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {item.name}
            </Link>
          ))}

          {/* 🔸 enlace “Legal” */}
          <div className="relative">
            <button
              type="button"
              id="nav-menu-legal"
              onClick={() => setIsOpen((prev) => (prev === "legal" ? false : "legal"))}
              className="md:flex md:items-center text-muted-foreground lg:px-2 xl:px-3 border-b-2 border-transparent hover:border-[var(--amarillo-principal)] hover:text-[var(--amarillo-principal)] focus:outline-none md:h-16 text-sm transition-colors"
            >
              Legal
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="ml-1 h-5 w-5 text-muted-foreground group-hover:text-[var(--amarillo-principal)] transition-colors"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* 🔽 Submenú visible al hacer clic */}
            {isOpen === "legal" && (
              <div className="absolute bg-background border border-border rounded-lg shadow-md mt-2 w-52 text-sm z-50">
                <Link
                  href="/legal/terms"
                  onClick={handleLegalLinkClick}
                  className="block px-4 py-2 hover:bg-muted transition-colors"
                >
                  Términos de Servicio
                </Link>
                <Link
                  href="/legal/privacy"
                  onClick={handleLegalLinkClick}
                  className="block px-4 py-2 hover:bg-muted transition-colors"
                >
                  Política de Privacidad
                </Link>
                <Link
                  href="/legal/disclaimer"
                  onClick={handleLegalLinkClick}
                  className="block px-4 py-2 hover:bg-muted transition-colors"
                >
                  Descargo de Responsabilidad
                </Link>
                <Link
                  href="/legal/cookies"
                  onClick={handleLegalLinkClick}
                  className="block px-4 py-2 hover:bg-muted transition-colors"
                >
                  Política de Cookies
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* 🔸 Tema + Login + Hamburguesa */}
        <div className="flex items-center gap-3">
          {/* <div className="fixed top-full mt-1.5 right-6 z-50 opacity-50 hover:opacity-100 transition">
            <ThemeSwitcher expandedWidth="w-36" />
          </div> */}
          <ActionButton
            href="/sign-in"
            label="Iniciar sesión" 
            expandDirection="left"
            icon={<LogIn size={20} />}
          />
          <button
            onClick={() => setIsOpen(isOpen === "mobile" ? false : "mobile")}
            className="md:hidden p-2 rounded hover:bg-muted"
          >
            {isOpen === "mobile" ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

      </div>

      {/* 🔻 Menú móvil desplegable */}
      {isOpen === "mobile" && (
        // <div className="md:hidden bg-background border-t border-border px-6 py-4 space-y-4">
          <div className="md:hidden bg-background border-t border-border px-6 py-4 space-y-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block text-lg transition-colors hover:text-[var(--amarillo-principal)] ${
                pathname === item.href
                  ? "text-[var(--amarillo-principal)] font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {item.name}
            </Link>
          ))}

          {/* 🔹 “Legal” también en menú móvil */}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Legal</p>
            <Link
              href="/legal/privacy"
              onClick={() => setIsOpen(false)}
              className="block text-base text-muted-foreground hover:text-[var(--amarillo-principal)]"
            >
              Política de Privacidad
            </Link>
            <Link
              href="/legal/terms"
              onClick={() => setIsOpen(false)}
              className="block text-base text-muted-foreground hover:text-[var(--amarillo-principal)]"
            >
              Términos de Servicio
            </Link>
          </div>

          <Link
            href="/sign-in"
            onClick={() => setIsOpen(false)}
            className="block bg-[var(--amarillo-principal)] text-black text-center px-4 py-2 rounded-xl font-medium hover:opacity-90 transition"
          >
            Iniciar sesión
          </Link>
        </div>
      )}
    </header>
  );
}
