"use client";

import { useState } from "react";
import { UploadCloud, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SubirDocumentosTab() {
  const [file, setFile] = useState<File | null>(null);
  const [archivos, setArchivos] = useState([
    { id: 1, nombre: "Contrato_Cliente.pdf", fecha: "2025-10-15", peso: "1.2 MB" },
    { id: 2, nombre: "Identificacion.jpg", fecha: "2025-10-10", peso: "580 KB" },
    { id: 3, nombre: "Comprobante_Pago.png", fecha: "2025-10-05", peso: "340 KB" },
  ]);

  const handleUpload = () => {
    if (!file) return toast.error("Selecciona un archivo antes de subirlo.");

    const nuevoArchivo = {
      id: archivos.length + 1,
      nombre: file.name,
      fecha: new Date().toISOString().split("T")[0],
      peso: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    };

    setArchivos([nuevoArchivo, ...archivos]);
    toast.success(`Archivo "${file.name}" subido correctamente`);
    setFile(null);
  };

  const eliminarArchivo = (id: number) => {
    setArchivos((prev) => prev.filter((a) => a.id !== id));
    toast.success("Archivo eliminado correctamente");
  };

  return (
    <Card className="card">
      {/* ENCABEZADO */}
      <CardHeader className="border-b border-[var(--color-border)] pb-2">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <CardTitle className="text-[var(--color-primary)] font-semibold border-l-4 border-[var(--color-primary)] pl-2">
            Subir Documentos
          </CardTitle>
        </div>
      </CardHeader>

      {/* CONTENIDO */}
      <CardContent className="pt-6 space-y-6">
        {/* ÁREA DE SUBIDA */}
        <div className="max-w-lg mx-auto text-center space-y-4">
          <div className="border-dashed border-2 border-[var(--color-border)] p-6 rounded-2xl bg-[var(--color-surface-alt)] hover:border-[var(--color-primary)] transition-colors">
            <UploadCloud className="mx-auto h-10 w-10 text-amber-400 mb-2" />
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-[var(--color-text)]"
            />
          </div>

          <Button
            onClick={handleUpload}
            className="btn-primary w-full md:w-auto font-semibold"
          >
            Subir Documento
          </Button>
        </div>

        {/* LISTA DE ARCHIVOS SUBIDOS */}
        <div>
          <h3 className="font-semibold text-[var(--color-primary)] mb-3 text-sm uppercase tracking-wide">
            Archivos Subidos
          </h3>

          <div className="space-y-3">
            {archivos.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="font-medium">{a.nombre}</p>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {a.fecha} • {a.peso}
                    </span>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => eliminarArchivo(a.id)}
                  className="hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {archivos.length === 0 && (
              <p className="text-sm text-center text-[var(--color-text-muted)] py-6">
                No hay archivos subidos.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
