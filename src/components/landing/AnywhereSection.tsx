// src/components/landing/AnywhereSection.tsx
import Image from "next/image";

export default function AnywhereSection() {
  return (
    <section
      id="platform"
      className="py-20 bg-background border-t border-border text-center"
    >
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Opera desde cualquier lugar
        </h2>
        <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
          Nuestra plataforma multiplataforma te permite acceder al mercado
          desde tu computadora, tablet o smartphone, con total seguridad y
          velocidad.
        </p>
        <div className="mx-auto w-full max-w-3xl">
          <Image
            src="/images/platform-devices.png"
            alt="Dispositivos BitLance"
            className="h-auto w-full rounded-2xl shadow-lg"
            width={1200}
            height={720}
            sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1024px) 80vw, 768px"
            priority={false}
          />
        </div>
      </div>
    </section>
  );
}
