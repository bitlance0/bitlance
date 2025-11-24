// src/components/landing/LeverageSection.tsx
export default function LeverageSection() {
  const benefits = [
    {
      title: "Apalancamiento Inteligente",
      desc: "Maximiza tus oportunidades con control total del riesgo.",
    },
    {
      title: "Comisiones Transparentes",
      desc: "Sin costos ocultos, sabrás exactamente lo que pagas.",
    },
    {
      title: "Seguridad de Nivel Bancario",
      desc: "Protección avanzada de tus fondos y datos personales.",
    },
  ];

  return (
    <section className="py-20 bg-card text-card-foreground border-t border-border">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Potencia tus inversiones
        </h2>
        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
          En BitLance te ofrecemos las herramientas más avanzadas del
          mercado para que puedas invertir con confianza y eficiencia.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-background rounded-2xl shadow-sm border border-border p-8"
            >
              <h3 className="text-xl font-semibold mb-3 text-[var(--amarillo-principal)]">
                {b.title}
              </h3>
              <p className="text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
