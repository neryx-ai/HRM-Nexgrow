import { z } from "zod/v4";

export const registerSchema = z.object({
  email: z
    .email("Email inválido")
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(12, "Mínimo 12 caracteres")
    .max(128)
    .regex(/[a-z]/, "Debe contener minúsculas")
    .regex(/[A-Z]/, "Debe contener mayúsculas")
    .regex(/[0-9]/, "Debe contener números")
    .regex(/[^a-zA-Z0-9]/, "Debe contener caracteres especiales"),
});

export const loginSchema = z.object({
  email: z
    .email()
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});
