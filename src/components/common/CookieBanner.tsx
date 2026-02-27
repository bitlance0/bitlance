// src/components/common/CookieBanner.tsx
"use client";

import { useState } from "react";
import { useCookieConsent } from "./CookieProvider";
import { CONSENT_VERSION } from "@/lib/cookies/consent";
import CookiePreferencesModal from "./CookiePreferencesModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CookieBanner() {
  const { consent, setConsent } = useCookieConsent();
  const [open, setOpen] = useState(false);
    console.log("Consentimiento actual:", consent);
  if (consent && consent.version === CONSENT_VERSION) return null;

  const acceptAll = () => {
    setConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    });
  };

  const acceptNecessary = () => {
    setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    });
  };

  return (
    <>
      <div className="bg-black/70 backdrop-blur-sm fixed bottom-6 z-[9999] w-full px-4">
        <Card   
          className="shadow-2xl rounded-2xl border"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--text-color)",
            borderColor: "var(--border)",
          }}
        >
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
            <p className="text-sm md:text-base opacity-90">
              Utilizamos cookies para mejorar tu experiencia en <span className="text-yellow-500 text-1xl">
                Bitlance
            </span> y analizar el tráfico de la plataforma.
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={acceptNecessary}
                className="border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition cursor-pointer"
                style={{
                  borderColor: "var(--border)",
                }}
              >
                Solo necesarias
              </Button>

              <Button
                variant="outline"
                onClick={() => setOpen(true)}
                className="cursor-pointer"
              >
                Configurar
              </Button>

              <Button
                onClick={acceptAll}
                className="cursor-pointer font-semibold"
                style={{
                  backgroundColor: "var(--amarillo-principal)",
                  color: "var(--negro)",
                }}
              >
                Aceptar todas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {open && <CookiePreferencesModal onClose={() => setOpen(false)} />}
    </>
  );
}