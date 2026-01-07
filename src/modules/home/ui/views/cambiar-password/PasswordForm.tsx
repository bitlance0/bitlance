"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { passwordSchema } from "@/lib/validations/password";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState, useTransition } from "react";
import { updatePassword } from "@/app/api/actions/update-password";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function UpdatePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = () => {
    startTransition(async () => {
      const res = await updatePassword(
        new FormData(document.querySelector("form")!)
      );

      if (res.error) {
        form.setError("currentPassword", {
          message: res.error.currentPassword?.[0] || "Error",
        });
        toast.error(res.error.currentPassword?.[0] || "Error al actualizar la contraseña.");
        return;
      }

      if (res.success) {
        // alert(res.success);
        toast.success("Contraseña actualizada correctamente.");
        form.reset();
      }
    });
  };

  return (
    <div className="max-w-md mx-auto mt-10 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-900 p-6 shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {hasPassword && (
            <PasswordField
              control={form.control}
              name="currentPassword"
              label="Contraseña actual"
              placeholder="Ingresa tu contraseña actual"
            />
          )}

          <PasswordField
            control={form.control}
            name="newPassword"
            label="Nueva contraseña"
            placeholder="Crea una nueva contraseña"
          />

          <PasswordField
            control={form.control}
            name="confirmPassword"
            label="Confirmar nueva contraseña"
            placeholder="Repite tu nueva contraseña"
          />

          <Button
            type="submit"
            disabled={isPending}
            className="mt-6 h-12 w-full rounded-full bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
          >
            {isPending
              ? "Guardando..."
              : hasPassword
                ? "Cambiar Contraseña"
                : "Crear Contraseña"}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-sm text-muted-foreground">
        <p className="mb-2 font-medium">Recomendaciones de seguridad:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Usa una combinación de letras, números y símbolos</li>
          <li>Evita información personal fácil de adivinar</li>
          <li>No reutilices contraseñas de otros servicios</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- Subcomponente visual ---------- */

function PasswordField({
  control,
  name,
  label,
  placeholder,
}: {
  control: any;
  name: "currentPassword" | "newPassword" | "confirmPassword";
  label: string;
  placeholder: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium">{label}</FormLabel>

          <FormControl>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={placeholder}
                className="h-12 rounded-xl bg-zinc-900 pr-12 text-sm placeholder:text-zinc-500"
                {...field}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>
            </div>
          </FormControl>

          <FormMessage className="text-red-400 " />
        </FormItem>
      )}
    />
  );
}
