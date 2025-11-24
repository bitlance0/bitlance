import { z } from "zod";

const passwordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[A-Z]/, "Debe tener al menos una letra mayúscula.")
      .regex(/[a-z]/, "Debe tener al menos una letra minúscula.")
      .regex(/[0-9]/, "Debe tener al menos un número.")
      .regex(/[^A-Za-z0-9]/, "Debe tener al menos un carácter especial."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export { passwordSchema };