//src/app/(public)/careers/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  email: z.string().min(1, "El correo es obligatorio.").email("Correo no válido."),
  phone: z.string().min(1, "El teléfono es obligatorio."),
  subject: z.string().min(1, "El asunto es obligatorio."),
  message: z.string().min(1, "El mensaje es obligatorio."),
});

export default function ContactFormView() {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 lg:px-20 py-16 lg:py-28 text-foreground bg-background">
      <div className="max-w-screen-xl w-full space-y-12">
        {/* Encabezado */}
        {/* <div className="text-center space-y-4 text-base w-full mt-10">
        <h2 className="text-[var(--amarillo-principal)] text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-6">
          Introducción al trading para principiantes
        </h2> */}
        <div className="text-center space-y-4 text-base w-full mt-10">
          <h2 className="text-[var(--amarillo-principal)] text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-6">
            Enciende el éxito junto a nosotros.
          </h2>
          <p className="text-base lg:text-lg font-light opacity-90 max-w-2xl mx-auto">
            ¿Listo para unirte a nuestro éxito financiero? Ya seas un desarrollador de negocios, especialista en marketing, ingeniero de software o cualquier otra persona, si crees que puedes crecer junto a nosotros, te invitamos a dejar tus datos a continuación.
          </p>
          <p className="text-base lg:text-lg font-medium">
            Uno de nuestros agentes se pondrá en contacto contigo en breve.
          </p>
        </div>

        {/* Contenedor principal */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-10 items-start">
          {/* Imagen */}
          <div className="relative w-full h-72 lg:h-full overflow-hidden rounded-2xl shadow-xl">
            <Image
              src="/images/hands_square.png"
              alt="Hands square"
              fill
              className="object-cover object-center"
            />
          </div>

          {/* Formulario */}
          <Card
            className="w-full mt-10 lg:mt-0 shadow-2xl rounded-2xl"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--text-color)",
            }}
          >
            <CardContent className="p-8 lg:p-10">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                  noValidate
                >
                  {/* Nombre */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Tu nombre completo"
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

                  {/* Teléfono */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="(+57) 300 000 0000"
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

                  {/* Asunto */}
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asunto</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Motivo del mensaje"
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

                  {/* Mensaje */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Escribe tu mensaje aquí..."
                            className="min-h-[120px]"
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

                  {/* Botón de envío */}
                  <Button
                    type="submit"
                    className="w-full font-semibold cursor-pointer"
                    disabled={loading}
                    style={{
                      backgroundColor: "var(--amarillo-principal)",
                      color: "var(--negro)",
                    }}
                  >
                    {loading ? "Enviando..." : "Enviar mensaje"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
