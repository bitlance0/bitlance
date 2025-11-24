// src/app/(public)/why-us/page.tsx
"use client";

import Image from "next/image";

export default function WhyUsPage() {
  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground">
      <section className="py-20 md:py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-12 items-center">
          {/* 🟡 Imagen lateral */}
          <div className="relative overflow-hidden rounded-2xl shadow-sm">
            <Image
              src="/images/phone_chart.webp"
              alt="Phone with charts"
              title="BitLance"
              width={800}
              height={800}
              className="w-full h-full object-cover object-center"
              priority
            />
          </div>

          {/* 🔹 Texto descriptivo */}
          <div className="text-muted-foreground text-base leading-relaxed">
            <h4 className="text-[var(--amarillo-principal)] text-sm font-semibold uppercase tracking-wide mb-3">
              ¿Por qué elegirnos?
            </h4>

            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-8">
              BitLance
            </h2>

            <div className="space-y-6">
              <p>
                BitLance surge del espíritu de personas ambiciosas unidas por
                una visión compartida de destacar en el mundo de las finanzas.
              </p>

              <p>
                Nuestro equipo está compuesto por expertos de diversas
                disciplinas, como tecnología, trading algorítmico, análisis de
                mercado, matemáticas cuantitativas y análisis de datos. Nos
                unimos para crear una plataforma sólida, eficiente y centrada en
                el usuario.
              </p>

              <p>
                Nuestro objetivo es introducir avances tecnológicos
                revolucionarios en la industria financiera, mientras brindamos
                un servicio personalizado e inigualable a cada cliente.
              </p>

              <p className="font-medium text-foreground">
                Aprovecha la oportunidad de unirte a{" "}
                <span className="text-[var(--amarillo-principal)] font-semibold">
                  BitLance
                </span>{" "}
                hoy mismo y comienza tu camino hacia un futuro financiero
                próspero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🔸 Footer */}
      <footer className="mt-auto py-6 border-t border-border bg-card text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} BitLance — Todos los derechos reservados.
      </footer>
    </main>
  );
}
