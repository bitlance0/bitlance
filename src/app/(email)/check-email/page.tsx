"use client";

export default function CheckEmailPage() {
  return (
    <main className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-2xl font-semibold">Revisa tu correo</h1>
        <p className="text-muted-foreground">
          Te enviamos un enlace para verificar tu email. El enlace expira en 24 horas.
        </p>
      </div>
    </main>
  );
}
