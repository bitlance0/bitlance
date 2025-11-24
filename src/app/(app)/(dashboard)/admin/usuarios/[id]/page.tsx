// src/app/(app)/(dashboard)/admin/usuarios/[id]/page.tsx
import UsuarioDetailView from "@/modules/usuarios/ui/views/usuario-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeTab = resolvedSearchParams.tab ?? "General";

  return (
    <UsuarioDetailView
      usuarioId={resolvedParams.id}
      activeTab={activeTab}
    />
  );
}
