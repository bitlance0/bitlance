// src/components/payments/CreatePaymentButton.tsx
"use client";

import { useState } from "react";

export function CreatePaymentButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      // Aquí, en un caso real, traerías amount/referenceId de tu lógica interna
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 1500,              // 15.00
          currency: "usd",
          referenceId: "ORD-2025-0001",
          description: "Pago demo servicio premium",
          customerEmail: "cliente@test.com",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        console.error("Error creando checkout:", data);
        alert(data.error ?? "Error creando pago");
        return;
      }

      // Redirigir a Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 disabled:opacity-50"
    >
      {loading ? "Creando link..." : "Pagar demo con Stripe"}
    </button>
  );
}
