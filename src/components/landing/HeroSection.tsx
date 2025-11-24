// src/components/landing/HeroSection.tsx
"use client";

import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/hero-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 text-center text-white px-6">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Invierte Inteligentemente con{" "}
          <span className="text-[var(--amarillo-principal)]">BitLance</span>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-gray-200">
          Opera los principales mercados financieros desde cualquier lugar del
          mundo, con herramientas profesionales y soporte 24/7.
        </p>
        <Link
          href="/sign-in"
          className="inline-block bg-[var(--amarillo-principal)] text-black px-8 py-3 rounded-xl font-semibold text-lg hover:opacity-90 transition"
        >
          Crea tu cuenta gratuita
        </Link>
      </div>
    </section>
  );
}
