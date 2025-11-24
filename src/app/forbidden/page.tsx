// src/app/forbidden/page.tsx
export default function ForbiddenPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold text-yellow-600">Acceso denegado</h1>
      <p className="mt-2 text-gray-600">
        No tienes permisos para acceder a esta sección.
      </p>
    </main>
  );
}
