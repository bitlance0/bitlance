// src/app/(public)/types-of-accounts/page.tsx

"use client";

export default function TypesOfAccountsPage() {
  const accounts = [
    {
      name: "SILVER",
      range: "US$5,000 – US$20,000",
      features: [
        "Soporte gratuito las 24 horas",
        "Indicadores de compra y venta",
        "Asesoramiento personalizado",
        "Noticias actualizadas de los mercados",
        "Gráficos y análisis de mercados",
        "Interfaz intuitiva y accesible para todos los niveles de experiencia",
        "Opera Forex, CFD, Índices, Acciones, materias primas, Metales, Monedas Digitales & Bonos",
      ],
    },
    {
      name: "GOLD",
      range: "US$21,000 – US$50,000",
      features: [
        "Plataforma de trading social",
        "Cambio de multiplicador para operaciones abiertas",
        "Soporte las 24 horas",
        "Trading signals",
        "Asesoramiento personalizado",
        "Noticias actualizadas de los mercados",
        "Gráficos y análisis de mercados",
        "Retiros e ingresos de capital de acuerdo a la necesidad del cliente",
        "Interfaz intuitiva y accesible para todos los niveles de experiencia",
        "Opera Forex, CFD, Índices, Acciones, materias primas, Metales, Monedas Digitales & Bonos",
      ],
    },
    {
      name: "PLATINUM",
      range: "US$51,000 – US$100,000",
      features: [
        "Cambio de multiplicador para operaciones abiertas",
        "Soporte las 24 horas",
        "Plataforma de trading social",
        "Trading signals",
        "Compensación de comisión por 1 retirada mensual por transferencia bancaria",
        "Asesoramiento personalizado",
        "Material informativo y tutoriales de trading online",
        "Asistencia técnica",
        "Noticias actualizadas de los mercados",
        "Gráficos y análisis de mercados",
        "Retiros e ingresos de capital según necesidad del cliente",
        "Opera Forex, CFD, Índices, Acciones, materias primas, Metales, Monedas Digitales & Bonos",
      ],
    },
    {
      name: "DIAMOND",
      range: "US$101,000 – US$170,000",
      features: [
        "Plataforma de trading social",
        "Trading signals",
        "Condiciones de trading individuales",
        "Manager VIP (soporte Premium)",
        "Operar telefónicamente",
        "Cambio de multiplicador para operaciones abiertas",
        "Compensación de comisión por 1 retirada mensual por transferencia bancaria",
        "Beneficios al operar criptomonedas automáticamente",
        "Herramientas profesionales para inversores avanzados",
        "Liquidez de primer nivel y precios competitivos",
        "Modificación de apalancamiento seccionado",
        "Asesoramiento personalizado",
        "Noticias actualizadas de los mercados",
        "Gráficos y análisis de mercados",
        "Opera Forex, CFD, Índices, Acciones, materias primas, Metales, Monedas Digitales & Bonos",
      ],
    },
    {
      name: "EXCLUSIVE",
      range: "US$171,000 – US$250,000",
      features: [
        "Trading signals",
        "Condiciones de trading exclusivas",
        "Manager VIP (soporte Premium)",
        "Operar telefónicamente",
        "Análisis de tendencias automatizado",
        "Ejecución rápida",
        "Soporte multilingüe",
        "Stop trailing",
        "Estrategia copia y pega trading",
        "Cambio de multiplicador para operaciones abiertas",
        "Compensación de comisión por 1 retirada mensual por transferencia bancaria",
        "Asesoramiento personalizado",
        "Noticias actualizadas de los mercados",
        "Gráficos y análisis de mercados",
        "Retiros e ingresos de capital según necesidad del cliente",
        "Servicios personalizados de análisis técnico y fundamental",
        "Interfaz intuitiva y accesible para todos los niveles de experiencia",
        "Acceso a los mercados mundiales",
        "Opera Forex, CFD, Índices, Acciones, materias primas, Metales, Monedas Digitales & Bonos",
      ],
    },
  ];

  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground">
      <section className="py-20 md:py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-3xl md:text-4xl xl:text-5xl font-extrabold mb-4 text-[var(--amarillo-principal)]">
            Tipos de Cuentas
          </h3>

          {/* 🔹 Grid de cuentas */}
          <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {accounts.map((acc) => (
              <div
                key={acc.name}
                className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6 flex flex-col items-center"
              >
                <h2 className="text-[var(--amarillo-principal)] font-semibold uppercase text-2xl text-center">
                  {acc.name}
                </h2>
                <h4 className="font-semibold uppercase mt-4">Saldo de Trading</h4>
                <h4 className="text-sm mt-1 text-muted-foreground">
                  Obligatorio: {acc.range}
                </h4>

                <ul className="text-sm text-muted-foreground list-disc list-inside mt-6 text-left space-y-1">
                  {acc.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 🔸 Términos y condiciones */}
          <div className="mt-24 space-y-4 text-center md:text-left">
            <h4 className="text-[var(--amarillo-principal)] text-base font-semibold uppercase">
              Términos y Condiciones
            </h4>
            <p className="text-sm text-muted-foreground leading-6 max-w-3xl mx-auto">
              Los fondos pueden ser retirados en todo momento, teniendo en
              cuenta que, al realizar el movimiento, la empresa será beneficiada
              con el 10% de las ganancias producidas. En caso de cancelación
              anticipada, dependiendo de la fecha de iniciación se fijará el
              plazo de cancelación.
            </p>
            <p className="text-sm text-muted-foreground font-semibold text-center">
              Para más detalles, comuníquese con su agente.
            </p>
          </div>
        </div>
      </section>

      {/* 🔹 Footer */}
      <footer className="mt-auto py-6 border-t border-border bg-card text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} BitLance — Todos los derechos reservados.
      </footer>
    </main>
  );
}
