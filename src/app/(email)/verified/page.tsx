"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function VerifiedContent() {
  const [err, setErr] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const sp = useSearchParams();
  const router = useRouter();

  const status = sp.get("status");
  const email = sp.get("email");
  const ok = status === "ok";

  async function handleResendVerification() {
    if (!email) {
      setErr(true);
      setErrMsg("No se encontró un correo válido en la URL.");
      return;
    }

    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(true);
        setErrMsg(data.error || "Error al reenviar el correo de verificación.");
        return;
      }

      if (data.alreadyVerified || data.message?.includes("ya fue verificado")) {
        setErr(true);
        setErrMsg("El correo ya fue verificado. Puedes iniciar sesión directamente.");
        return;
      }

      router.push("/check-email");
    } catch (error) {
      console.error(error);
      setErr(true);
      setErrMsg("Ocurrió un error al reenviar el correo. Intenta nuevamente.");
    }
  }

  return (
    <main className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          {ok ? "¡Correo verificado!" : "Enlace inválido o expirado"}
        </h1>

        <p className="text-muted-foreground">
          {ok
            ? "Tu correo ha sido confirmado. Ya puedes iniciar sesión."
            : "Solicita un nuevo correo de verificación e inténtalo de nuevo."}
        </p>

        <div className="flex gap-3 justify-center flex-wrap mt-4">
          <Button
            className="w-full cursor-pointer hover:underline"
            style={{
              minWidth: "150px",
              backgroundColor: "var(--amarillo-principal)",
              color: "var(--text-color)",
            }}
            onClick={() => router.push("/sign-in")}
          >
            Ir a iniciar sesión
          </Button>

          {!ok && (
            <Button
              variant="outline"
              className="w-full cursor-pointer hover:underline"
              style={{ minWidth: "150px" }}
              onClick={handleResendVerification}
            >
              Reenviar verificación
            </Button>
          )}

          {err && (
            <p className="w-full text-red-400 mt-3 text-sm">
              {errMsg || "Error al reenviar el correo de verificación."}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <VerifiedContent />
    </Suspense>
  );
}
