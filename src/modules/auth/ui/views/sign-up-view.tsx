// src/modules/auth/ui/views/sign-up-view.tsx
"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Checkbox
} from "@/components/ui/checkbox"; // si no lo tienes, cambia por tu componente
import { useForm } from "react-hook-form";
import { OctagonAlertIcon } from "lucide-react";
import GoogleIcon from "@/../public/icons/google-icon";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
// import { useRouter } from "next/navigation";

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Z]/, "Debe tener al menos una letra mayúscula.")
  .regex(/[a-z]/, "Debe tener al menos una letra minúscula.")
  .regex(/[0-9]/, "Debe tener al menos un número.")
  .regex(/[^A-Za-z0-9]/, "Debe tener al menos un carácter especial.");

const formSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre es obligatorio.")
      .max(80, "Máximo 80 caracteres."),
    email: z
      .string()
      .min(1, "El correo es obligatorio.")
      .email("Introduce un correo válido."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, "Debes aceptar los Términos y la Política."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const SignUpView = () => {
  const route = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState({ p1: false, p2: false });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const translateErrorMessage = (message: string) => {
    const translations: Record<string, string> = {
      "User already exists": "Este correo ya está registrado.",
      "Email already in use": "Este correo ya está registrado.",
      "Invalid email or password": "Datos inválidos.",
      "Too many requests": "Demasiadas solicitudes. Intenta de nuevo más tarde.",
      "Email not verified": "Debes verificar tu correo para continuar.",
      "User already exists. Use another email.": "Este correo ya está registrado.",
    };
    return translations[message] || message;
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setLoading(true);
    try {
      // better-auth suele exponer signUp.email; si tu cliente usa otra firma, ajusta aquí.
      await authClient.signUp.email(
        { email: data.email, password: data.password, name: data.name },
        {
          onSuccess: async () => {
            setLoading(false);
            alert("Registro exitoso. Revisa tu correo para verificar tu cuenta.");
            route.replace("/");
          },
          onError: ({ error }) => {
            setLoading(false);
            setError(
              translateErrorMessage(error.message) ||
              "Ocurrió un error, intenta nuevamente."
            );
          },
        }
      );
    } catch (err: any) {
      setLoading(false);
      setError(
        translateErrorMessage(err?.message) ||
        "Ocurrió un error, intenta nuevamente."
      );
    }
  };

  const handleGoogleSignup = () => {
    setLoading(true);
    // Para alta con Google, generalmente el flujo social crea la cuenta si no existe.
    authClient.signIn.social(
      { provider: "google" },
      {
        onSuccess: () => {
          setLoading(false);
          route.replace("/");
        },
        onError: () => {
          setLoading(false);
          setError("Ocurrió un error con Google, intenta nuevamente.");
        },
      }
    );
  };

  return (
    <>
      <div className="min-h-screen flex-1 flex flex-col items-center justify-center px-6 text-center xs:mt-[10%] md:mt-5">
        <Card
          className="w-full max-w-md mx-auto shadow-2xl rounded-2xl"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--text-color)",
          }}
        >
          <CardContent className="p-6 md:p-10">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Logo" width={80} height={80} />
              <h1
                className="mb-2 text-2xl font-bold text-center xs:pl-[-10px]"
                style={{ color: "var(--amarillo-principal)" }}
              >
                BitLance
              </h1>
            </div>

            <p className="text-sm opacity-80 text-center">
              Crea tu cuenta para comenzar a usar BitLance.
            </p>

            <Form {...form}>
              <form
                className="mt-6 space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
              >
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Tu nombre"
                          style={{
                            backgroundColor: "var(--card)",
                            color: "var(--text-color)",
                            borderColor: "var(--border)",
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-300" />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="m@ejemplo.com"
                          style={{
                            backgroundColor: "var(--card)",
                            color: "var(--text-color)",
                            borderColor: "var(--border)",
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-300" />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPass.p1 ? "text" : "password"}
                            placeholder="********"
                            style={{
                              backgroundColor: "var(--card)",
                              color: "var(--text-color)",
                              borderColor: "var(--border)",
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 cursor-pointer"
                            onClick={() =>
                              setShowPass((s) => ({ ...s, p1: !s.p1 }))
                            }
                            aria-pressed={showPass.p1}
                          >
                            {showPass.p1 ? "Ocultar" : "Mostrar"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-300" />
                    </FormItem>
                  )}
                />

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPass.p2 ? "text" : "password"}
                            placeholder="********"
                            style={{
                              backgroundColor: "var(--card)",
                              color: "var(--text-color)",
                              borderColor: "var(--border)",
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 cursor-pointer"
                            onClick={() =>
                              setShowPass((s) => ({ ...s, p2: !s.p2 }))
                            }
                            aria-pressed={showPass.p2}
                          >
                            {showPass.p2 ? "Ocultar" : "Mostrar"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-300" />
                    </FormItem>
                  )}
                />

                {/* Terms */}
                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 text-left">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                          aria-label="Aceptar términos"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal text-sm">
                          Acepto los{" "}
                          {/* <a
                            href="#"
                            className="underline"
                            style={{ color: "var(--amarillo-principal)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Términos de Servicio
                          </a> */}
                          <small style={{ color: "var(--amarillo-principal)" }}>Términos de Servicio</small>
                          {" "}y la{" "}
                          {/* <a
                            href="#"
                            className="underline"
                            style={{ color: "var(--amarillo-principal)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Política de Privacidad
                          </a> */}
                          <small style={{ color: "var(--amarillo-principal)" }}>Política de Privacidad</small>
                        </FormLabel>
                        <FormMessage className="text-xs text-red-300" />
                      </div>
                    </FormItem>
                  )}
                />


                {/* Errores */}
                {!!error && (
                  <Alert className="bg-destructive/10 border-none text-red-600">
                    <OctagonAlertIcon className="h-4 w-4 !text-destructive" />
                    <AlertTitle className="select-none">{error}</AlertTitle>
                  </Alert>
                )}

                {/* Botón principal */}
                <Button
                  type="submit"
                  className="w-full cursor-pointer font-semibold"
                  disabled={loading}
                  style={{
                    backgroundColor: "var(--amarillo-principal)",
                    color: "var(--negro)",
                  }}
                >
                  {loading ? "Registrando..." : "Crear cuenta"}
                </Button>

                {/* Divider */}
                <div className="relative text-center text-sm text-muted-foreground">
                  <span className="bg-card relative z-10 px-2">O continúa con</span>
                  <div className="absolute inset-0 top-1/2 border-t"></div>
                </div>

                {/* Google */}
                <Button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 cursor-pointer font-medium"
                  variant="outline"
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--text-color)",
                    borderColor: "var(--border)",
                  }}
                >
                  <GoogleIcon />
                  Registrarme con Google
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs mt-5 opacity-75">
          ¿Ya tienes cuenta?{" "}
          <a href="/sign-in" style={{ color: "var(--amarillo-principal)" }}>
            Inicia sesión
          </a>
        </div>
      </div>
    </>
  );
};
