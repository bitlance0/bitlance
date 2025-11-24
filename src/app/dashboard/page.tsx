// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Panel Privado</h1>
      <p>Solo usuarios con sesión activa pueden entrar aquí.</p>
    </main>
  );
}
