// src/app/admin/pagos/cancelled/page.tsx

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="max-w-md w-full mx-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-3">
        <h1 className="text-2xl font-semibold">Pago cancelado ❌</h1>
        <p className="text-sm text-neutral-300">
          El proceso de pago ha sido cancelado.
        </p>
        <p className="text-xs text-neutral-500">
          Si deseas intentar nuevamente, por favor regresa al enlace de pago o contacta al administrador.
        </p>
      </div>
    </div>
  );
}
