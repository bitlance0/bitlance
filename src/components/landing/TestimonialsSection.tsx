// src/components/landing/TestimonialsSection.tsx
import TestimonialCard from "@/components/landing/testimonials/TestimonialCard";
import testimonialsData from "@/components/landing/testimonials/testimonialsData";

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-background text-foreground border-t border-border">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Lo que dicen nuestros usuarios
        </h2>
        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
          Más de 10.000 inversores confían en BitLance cada día para
          gestionar sus operaciones con total transparencia y eficiencia.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonialsData.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}
