// src/app/(public)/layout.tsx
import HeaderPublic from "@/components/layout/header-public";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderPublic />
      <main className="flex-1">{children}</main>
    </div>
  );
}
