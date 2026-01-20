"use client";

import * as React from "react";
import { useState } from "react";
import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Info } from "lucide-react";

/* ---------- Tipos compatibles con tu página ---------- */
export type Cuenta = {
  id: string;
  numero: string;
  tipo: "trading" | "inversion" | "ahorro";
  moneda: "USD" | "BTC" | "ETH" | string;
  balance: number;
  balanceDisponible: number;
  estado: "activa" | "suspendida" | "cerrada";
  fechaCreacion: string; // YYYY-MM-DD
};

type Props = {
  onCreated: (nueva: Cuenta) => void; // el padre hará el push
  triggerClassName?: string;
};

/* ---------- Diccionario de ayudas (tooltips) ---------- */
const HELP: Record<
  "alias" | "tipo" | "moneda" | "apalancamiento" | "depositoInicial" | "terminos",
  string
> = {
  alias:
    "Nombre visible para identificar la cuenta cuando tengas varias (no afecta a la operativa).",
  tipo:
    "Define reglas y objetivo de la cuenta: Trading (alta frecuencia), Inversión (largo plazo), Ahorro (baja rotación).",
  moneda:
    "Moneda base contable de la cuenta. No se puede cambiar tras la creación.",
  apalancamiento:
    "Multiplica tu exposición. 1 = sin apalancamiento. Valores altos incrementan riesgo.",
  depositoInicial:
    "Fondo inicial opcional acreditado como Balance y Disponible al crear la cuenta.",
  terminos:
    "Confirma que entendiste las condiciones de uso y riesgos de la cuenta.",
};

/* ---------- Validación ---------- */
const schema = z.object({
  alias: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  tipo: z.enum(["trading", "inversion", "ahorro"] as const, { message: "Selecciona un tipo de cuenta" }),
  moneda: z.enum(["USD", "BTC", "ETH"] as const, { message: "Selecciona la moneda base" }),
  apalancamiento: z
    .string()
    .default("1")
    .refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) >= 1 && Number(v) <= 100, {
      message: "Apalancamiento entre 1 y 100",
    }),
  depositoInicial: z
    .string()
    .transform((v) => (v.trim() === "" ? "0" : v))
    .refine((v) => /^\d+(\.\d+)?$/.test(v), { message: "Monto inválido" }),
  aceptarTerminos: z.boolean().refine((v) => v === true, { message: "Debes aceptar los términos" }),
});

type FormValues = z.infer<typeof schema>;

/* ---------- Utils ---------- */
function randomDigits(len = 9) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}

/* ---------- Componente ---------- */
export default function AddAccountDrawer({ onCreated, triggerClassName }: Props) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues, any>,
    defaultValues: {
      alias: "",
      tipo: "trading",
      moneda: "USD",
      apalancamiento: "1",
      depositoInicial: "0",
      aceptarTerminos: false,
    },
  });

  const moneda = watch("moneda");
  const deposito = Number(watch("depositoInicial") || "0");

  const onSubmit = async (values: FormValues) => {
    try {
      await new Promise((r) => setTimeout(r, 500)); // simulación

      const id = crypto.randomUUID();
      const numero = `${values.moneda}-${randomDigits(9)}`;
      const hoy = new Date();
      const iso = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
        .toISOString()
        .slice(0, 10);

      const nueva: Cuenta = {
        id,
        numero,
        tipo: values.tipo,
        moneda: values.moneda,
        balance: Number(values.depositoInicial || 0),
        balanceDisponible: Number(values.depositoInicial || 0),
        estado: "activa",
        fechaCreacion: iso,
      };

      onCreated(nueva);
      toast.success("Cuenta creada exitosamente");
      setOpen(false);
      reset();
    } catch {
      toast.error("No se pudo crear la cuenta");
    }
  };

  /* ---------- Render ---------- */
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* <SheetTrigger asChild>
        <Button className={triggerClassName ?? "bg-yellow-400 text-black hover:bg-yellow-500"}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cuenta
        </Button>
      </SheetTrigger> */}

      <SheetContent className="sm:max-w-lg bg-[var(--color-surface-alt)] p-4">
        <SheetHeader>
          <SheetTitle className="text-yellow-400">Crear nueva cuenta</SheetTitle>
          <SheetDescription className="text-[var(--color-text-muted)]">
            Completa la configuración básica. La <b>moneda base</b> no podrá cambiarse después.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {/* Alias */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="alias">Nombre / Alias</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {HELP.alias}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input id="alias" placeholder="Ej. Cuenta Trading USD" {...register("alias")} />
            {errors.alias && <p className="text-xs text-red-500">{errors.alias.message}</p>}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Tipo de cuenta</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {HELP.tipo}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select defaultValue="trading" onValueChange={(v) => setValue("tipo", v as any, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trading">Trading</SelectItem>
                <SelectItem value="inversion">Inversión</SelectItem>
                <SelectItem value="ahorro">Ahorro</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && <p className="text-xs text-red-500">{errors.tipo.message}</p>}
          </div>

          {/* Moneda */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label>Moneda base</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {HELP.moneda}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select defaultValue="USD" onValueChange={(v) => setValue("moneda", v as any, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona la moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
              </SelectContent>
            </Select>
            {errors.moneda && <p className="text-xs text-red-500">{errors.moneda.message}</p>}
          </div>

          {/* Apalancamiento */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="apl">Apalancamiento (1–100)</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {HELP.apalancamiento}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input id="apl" placeholder="1" {...register("apalancamiento")} />
            {errors.apalancamiento && <p className="text-xs text-red-500">{errors.apalancamiento.message}</p>}
          </div>

          {/* Depósito inicial */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="dep">Depósito inicial (opcional)</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {HELP.depositoInicial}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input id="dep" placeholder="0" {...register("depositoInicial")} />
            {errors.depositoInicial && <p className="text-xs text-red-500">{errors.depositoInicial.message}</p>}
            <p className="text-xs text-[var(--color-text-muted)]">
              Se acreditará como <b>Balance</b> y <b>Disponible</b> inicial en {moneda}. Valor actual:{" "}
              <b>{isNaN(deposito) ? 0 : deposito} {moneda}</b>
            </p>
          </div>

          {/* Términos */}
          <div className="flex items-start gap-2">
            <input id="t" type="checkbox" className="mt-1" {...register("aceptarTerminos")} />
            <div className="flex items-center gap-1">
              <Label htmlFor="t" className="text-sm">Acepto los términos de uso</Label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-[var(--color-text-muted)] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {HELP.terminos}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {errors.aceptarTerminos && <p className="text-xs text-red-500">{errors.aceptarTerminos.message}</p>}

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-w-24">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-yellow-400 text-black hover:bg-yellow-500 min-w-24">
              {isSubmitting ? "Creando…" : "Crear cuenta"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
