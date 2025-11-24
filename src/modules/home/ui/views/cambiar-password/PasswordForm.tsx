"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { passwordSchema } from "@/lib/validations/password";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTransition } from "react";
import { updatePassword } from "@/app/api/actions/update-password";

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
      const res = await updatePassword(new FormData(document.querySelector("form")!));

      if (res.error) {
        form.setError("currentPassword", { message: res.error.currentPassword?.[0] || "Error" });
        // toast.error(res.error.currentPassword?.[0] || "Error al actualizar la contraseña.");
        return;
      }
      if (res.success) {
        // toast.success("Contraseña actualizada correctamente.");
        alert(res.success);
        form.reset();
      }
    });
  };

  return (
    <div className="max-w-lvh mx-auto mt-10 bg-card p-6 rounded-2xl shadow">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {hasPassword && (
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-5" disabled={isPending}>
            {isPending ? "Guardando..." : hasPassword ? "Actualizar" : "Crear contraseña"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
