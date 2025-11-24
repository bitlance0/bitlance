"use client";

import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";

export default function UsuarioModal({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();

  const close = () => router.push("/usuarios");

  return (
    <Modal onClose={close}>
      <div className="p-4">
        <h2 className="text-lg font-bold">Usuario {usuarioId}</h2>
        <p>Información detallada del usuario {usuarioId}...</p>
      </div>
    </Modal>
  );
}
