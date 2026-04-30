"use client";

import { useMemo, useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  CheckCircle2,
  Copy,
  Download,
  FileDown,
  ReceiptText,
  Share2,
  Wallet,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-shared";
import { toast } from "sonner";

type WithdrawalReceiptData = {
  id: string;
  amount: number;
  currency?: string | null;
  status?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  withdrawalReference?: string | null;
  ticketReference?: string | null;
  destinationAddress?: string | null;
  payoutMethod?: string | null;
  reviewDecision?: string | null;
  reviewedAt?: string | null;
  requestedAt?: string | null;
  adminNote?: string | null;
};

type WithdrawalReceiptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WithdrawalReceiptData | null;
};

function formatMoney(value: number) {
  return Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("es-ES");
}

function getStatusLabel(
  status?: string | null,
  reviewDecision?: string | null
): string {
  if (reviewDecision === "approved" || status === "completed") {
    return "Completado";
  }

  if (reviewDecision === "rejected" || status === "failed") {
    return "Rechazado";
  }

  return "Pendiente";
}

function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

export function WithdrawalReceiptModal({
  open,
  onOpenChange,
  data,
}: WithdrawalReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState<"image" | "pdf" | "share" | null>(
    null
  );

  const fileBaseName = useMemo(() => {
    if (!data) return "detalle-retiro";
    return `detalle-retiro-${data.withdrawalReference ?? data.id.slice(0, 8)}`;
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Referencia",
        value: data.withdrawalReference,
        copyable: true,
      },
      {
        label: "Ticket",
        value: data.ticketReference,
        copyable: true,
      },
      {
        label: "Método",
        value: getWithdrawalMethodLabel(data.payoutMethod ?? null),
      },
      {
        label: "Dirección de salida",
        value: data.destinationAddress,
        copyable: true,
        mono: true,
      },
      {
        label: "Cuenta",
        value: data.accountName,
      },
      {
        label: "Número de cuenta",
        value: data.accountNumber,
      },
      {
        label: "Fecha de solicitud",
        value: formatDate(data.requestedAt),
      },
      {
        label: "Fecha de aprobación",
        value: formatDate(data.reviewedAt),
      },
      {
        label: "Observación",
        value: data.adminNote,
      },
    ].filter((row) => Boolean(row.value));
  }, [data]);

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiada.`);
    } catch {
      toast.error(`No se pudo copiar ${label.toLowerCase()}.`);
    }
  }

  async function createPng() {
    if (!receiptRef.current) {
      throw new Error("No se encontró la tirilla para exportar.");
    }

    return toPng(receiptRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#f8fafc",
    });
  }

  async function handleDownloadImage() {
    try {
      setExporting("image");
      const pngUrl = await createPng();
      downloadUrl(pngUrl, `${fileBaseName}.png`);
      toast.success("Imagen descargada.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo descargar la imagen.");
    } finally {
      setExporting(null);
    }
  }

  async function handleDownloadPdf() {
    try {
      setExporting("pdf");
      const pngUrl = await createPng();
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo preparar la imagen."));
        img.src = pngUrl;
      });

      const ratio = Math.min(
        (pageWidth - 32) / img.width,
        (pageHeight - 32) / img.height
      );
      const width = img.width * ratio;
      const height = img.height * ratio;
      const x = (pageWidth - width) / 2;
      const y = 16;

      pdf.addImage(pngUrl, "PNG", x, y, width, height, undefined, "FAST");
      pdf.save(`${fileBaseName}.pdf`);
      toast.success("PDF descargado.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo descargar el PDF.");
    } finally {
      setExporting(null);
    }
  }

  async function handleShare() {
    try {
      setExporting("share");

      if (!navigator.share || !receiptRef.current) {
        await handleDownloadImage();
        return;
      }

      const blob = await toBlob(receiptRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#f8fafc",
      });

      if (!blob) {
        throw new Error("No se pudo generar el archivo.");
      }

      const file = new File([blob], `${fileBaseName}.png`, {
        type: "image/png",
      });

      if ("canShare" in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Detalle de Retiro",
          files: [file],
        });
        toast.success("Comprobante compartido.");
        return;
      }

      const url = URL.createObjectURL(blob);
      downloadUrl(url, `${fileBaseName}.png`);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Tu navegador descargó la imagen para compartirla.");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        console.error(error);
        toast.error("No se pudo compartir el comprobante.");
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-1.5rem)] max-w-[560px] gap-0 overflow-hidden border-none bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">Detalle de Retiro</DialogTitle>
        <DialogDescription className="sr-only">
          Tirilla del retiro con información lista para descargar o compartir.
        </DialogDescription>

        <div className="rounded-[2rem] bg-white p-3 shadow-[0_30px_80px_rgba(15,23,42,0.45)]">
          <div
            ref={receiptRef}
            className="overflow-hidden rounded-[1.75rem] bg-[#fcfcfd] text-slate-900"
          >
            <div className="border-b border-slate-200/80 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                  aria-label="Cerrar detalle de retiro"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="text-center">
                  <p className="text-xl font-semibold tracking-tight">
                    Detalle de Retiro
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                  <ReceiptText className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="text-center">
                <p className="text-[2rem] font-semibold tracking-tight text-slate-950 md:text-[2.35rem]">
                  -{formatMoney(data?.amount ?? 0)} {data?.currency ?? "USD"}
                </p>

                <div className="mt-3 flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-lg font-medium">
                    {getStatusLabel(data?.status, data?.reviewDecision)}
                  </span>
                </div>

                <div className="mt-3 flex justify-center">
                  <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 shadow-none">
                    {getWithdrawalMethodLabel(data?.payoutMethod ?? null)}
                  </Badge>
                </div>
              </div>

              <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[120px_1fr_auto] items-start gap-3"
                  >
                    <p className="text-sm text-slate-500">{row.label}</p>
                    <p
                      className={`text-right text-sm text-slate-900 ${
                        row.mono ? "break-all font-mono text-[13px]" : ""
                      }`}
                    >
                      {row.value}
                    </p>
                    {row.copyable && typeof row.value === "string" ? (
                      <button
                        type="button"
                        onClick={() => void copyValue(row.value!, row.label)}
                        className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                        aria-label={`Copiar ${row.label}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="h-8 w-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => void handleShare()}
              disabled={!data || exporting !== null}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {exporting === "share" ? "Preparando..." : "Compartir"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => void handleDownloadImage()}
              disabled={!data || exporting !== null}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "image" ? "Exportando..." : "Imagen"}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-2xl bg-[var(--color-primary)] text-[var(--color-bg)] hover:opacity-90"
              onClick={() => void handleDownloadPdf()}
              disabled={!data || exporting !== null}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {exporting === "pdf" ? "Exportando..." : "PDF"}
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
            <Wallet className="h-4 w-4 text-[var(--color-primary)]" />
            Descargar o compartir comprobante
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
