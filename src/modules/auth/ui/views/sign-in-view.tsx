// src/modules/auth/ui/views/sign-in-view.tsx
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

import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { OctagonAlertIcon } from "lucide-react";
import GoogleIcon from "@/../public/icons/google-icon";
// import { useRouter } from "next/navigation";


const formSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio.")
    .email("Introduce un correo válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .regex(/[A-Z]/, "Debe tener al menos una letra mayúscula.")
    .regex(/[a-z]/, "Debe tener al menos una letra minúscula.")
    .regex(/[0-9]/, "Debe tener al menos un número.")
    .regex(/[^A-Za-z0-9]/, "Debe tener al menos un carácter especial."),
});

export const SignInView = () => {
  // const route = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const translateErrorMessage = (message: string) => {
    const translations: Record<string, string> = {
      "Invalid email or password": "Credenciales inválidas.",
      "User not found": "Usuario no encontrado.",
      "Email not verified": "Correo no verificado.",
      "Too many requests":
        "Demasiadas solicitudes. Intenta de nuevo más tarde.",
    };
    return translations[message] || message;
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setError(null);
    setLoading(true);
    authClient.signIn.email(
      { email: data.email, password: data.password },
      {
        onSuccess: () => {
          setLoading(false);
          // route.push("/");
          // route.replace("/"); // 👈 evita que quede en el history el landing
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
  };

  const handleGoogleSignin = () => {
    setLoading(true);
    authClient.signIn.social(
      { provider: "google" },
      {
        onSuccess: () => {
          setLoading(false);
          // route.push("/");
          // route.replace("/"); // 👈 evita que quede en el history el landing
        },
        onError: () => {
          setLoading(false);
          setError("Ocurrió un error, intenta nuevamente.");
        },
      }
    );
  };

  return (
    <>
      <div className="min-h-screen flex-1 flex flex-col items-center justify-center px-6 text-center">

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
                className="mb-2 text-2xl font-bold text-center"
                style={{ color: "var(--amarillo-principal)" }}
              >
                BitLance
              </h1>
            </div>
            <p className="text-sm opacity-80 text-center">
              Inicia sesión para acceder a todas las funcionalidades.
            </p>

            <Form {...form}>
              <form
                className="mt-6 space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
              >
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
                      <FormMessage />
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
                            type={showPassword ? "text" : "password"}
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
                            onClick={() => setShowPassword((s) => !s)}
                            aria-pressed={showPassword}
                          >
                            {showPassword ? "Ocultar" : "Mostrar"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
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
                  {loading ? "Cargando..." : "Iniciar Sesión"}
                </Button>

                {/* Divider */}
                <div className="relative text-center text-sm text-muted-foreground">
                  <span className="bg-card relative z-10 px-2">O continúa con</span>
                  <div className="absolute inset-0 top-1/2 border-t"></div>
                </div>

                {/* Google Signin */}
                <Button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 cursor-pointer font-medium"
                  variant="outline"
                  onClick={handleGoogleSignin}
                  disabled={loading}
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--text-color)",
                    borderColor: "var(--border)",
                  }}
                >
                  <GoogleIcon />
                  Iniciar sesión con Google
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="text-xs text-center mt-3">
          ¿No tienes una cuenta?{" "}
          <a
            href="/sign-up"
            style={{ color: "var(--amarillo-principal)" }}
          >
            Regístrate
          </a>
        </div>

        {/* Footer */}
        <div className="text-center text-xs mt-5 opacity-75">
          Al continuar, aceptas nuestros{" "}
          <a href="#" style={{ color: "var(--amarillo-principal)" }}>
            Términos de Servicio
          </a>{" "}
          y nuestra{" "}
          <a href="#" style={{ color: "var(--amarillo-principal)" }}>
            Política de Privacidad
          </a>
          .
        </div>
      </div>
    </>
  );
};
