// src/app/pagos/success/page.tsx
// (o src/app/admin/pagos/success/page.tsx si la quieres bajo /admin)

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="max-w-md w-full mx-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
        <h1 className="text-2xl font-semibold">Pago recibido ✅</h1>
        <p className="text-sm text-neutral-300">
          Tu pago se ha procesado correctamente.
        </p>
        <p className="text-xs text-neutral-500">
          En unos momentos verás el saldo actualizado en tu cuenta. 
          Puedes cerrar esta ventana con tranquilidad.
        </p>
      </div>
    </div>
  );
}
