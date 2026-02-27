"use client";

import { useState } from "react";
import { useCookieConsent } from "./CookieProvider";
import { CONSENT_VERSION } from "@/lib/cookies/consent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CookiePreferencesModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { setConsent } = useCookieConsent();

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(false);

  const save = () => {
    setConsent({
      necessary: true,
      analytics,
      marketing,
      functional,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    });
    onClose();
  };

  return (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[99999] px-4">
      <Card
        className="w-full max-w-lg shadow-2xl rounded-2xl"
        style={{
          backgroundColor: "var(--card)",
          color: "var(--text-color)",
          borderColor: "var(--border)",
        }}
      >
        <CardContent className="p-8 space-y-6">
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--amarillo-principal)" }}
          >
            Preferencias de Cookies
          </h2>

          <p className="text-sm opacity-80">
            Puedes elegir qué tipo de cookies deseas permitir.
          </p>

          <div className="space-y-4">
            <Toggle
              label="Analytics"
              value={analytics}
              onChange={setAnalytics}
            />
            <Toggle
              label="Marketing"
              value={marketing}
              onChange={setMarketing}
            />
            <Toggle
              label="Funcionales"
              value={functional}
              onChange={setFunctional}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>

            <Button
              onClick={save}
              className="font-semibold"
              style={{
                backgroundColor: "var(--amarillo-principal)",
                color: "var(--negro)",
              }}
            >
              Guardar preferencias
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-3">
      <span>{label}</span>

      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition relative ${
          value ? "bg-[var(--amarillo-principal)]" : "bg-zinc-500"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
            value ? "right-1" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}