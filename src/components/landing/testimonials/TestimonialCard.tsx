// src/components/landing/testimonials/TestimonialCard.tsx
import Image from 'next/image';
type Props = {
  name: string;
  role: string;
  text: string;
  image: string;
};

export default function TestimonialCard({ name, role, text, image }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-left shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-4 mb-4">
        <Image
          src={image}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
          width={48}
          height={48}
        />
        <div>
          <h4 className="font-semibold">{name}</h4>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">“{text}”</p>
    </div>
  );
}
