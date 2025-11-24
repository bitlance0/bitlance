"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserStore } from "@/stores/useUserStore";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  status: z.string(),
  // numero con decimales
  balance: z.string(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function ProfileForm() {
  const { user, setUser } = useUserStore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      status: "",
      balance: "",
    },
  });

  // Pre-cargar datos del store
  useEffect(() => {
    if (user) {
      // Mapear User a UserFormData y convertir balance a string para que coincidan los tipos
      form.reset({
        name: user.name ?? "",
        email: user.email ?? "",
        status: user.status ?? "",
        balance: user.balance != null ? String(user.balance) : "",
      });
    }
  }, [user, form]);

  const onSubmit = async (values: UserFormData) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Error al actualizar la cuenta");

      const updatedUser = await res.json();
      setUser(updatedUser); // 🔁 sincroniza con el store
      alert("Datos actualizados correctamente ✅");
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-lvh mx-auto mt-10 bg-card p-6 rounded-2xl shadow">
      <h2 className="text-lg font-semibold mb-4">Editar perfil</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input {...field} type="email" disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Balance */}
          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Balance</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    disabled
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-5" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
