// src/app/blocked/page.tsx
export default function BlockedPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold text-red-600">Cuenta bloqueada</h1>
      <p className="mt-2 text-gray-600">
        Tu cuenta está suspendida o bloqueada. Contacta al soporte.
      </p>
    </main>
  );
}
