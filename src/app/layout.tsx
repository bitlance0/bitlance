// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSync from "@/components/AuthSync";
import { CookieProvider } from "@/components/common/CookieProvider";
import CookieBanner from "@/components/common/CookieBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BitLance",
  description: "Plataforma de gestión financiera",
};

// 🔹 Tema forzado a oscuro antes de hidratar React
const setInitialTheme = `(function() {
  try {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  }
})();`;

import Script from "next/script";
import { Toaster } from "sonner";
import WhatsAppFloatingButton from "@/components/common/WhatsappButton";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} /> */}
        <Script id="set-initial-theme" strategy="beforeInteractive">
          {setInitialTheme}
        </Script>
      </head>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Toaster position="top-right" richColors closeButton />

        <CookieProvider>
          <AuthSync>
            <>
              <WhatsAppFloatingButton phoneNumber="346124588073" />
              {children}
              <CookieBanner />
            </>
          </AuthSync>
        </CookieProvider>
      </body>
    </html>
  );
}
