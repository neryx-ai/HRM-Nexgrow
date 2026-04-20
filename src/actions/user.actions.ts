"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema/auth.schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { CreateUserSchema } from "@/lib/validations/auth";
import { emailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import crypto from "crypto";

function generateTempPassword(length = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "@$!%*?&";
  const allChars = uppercase + lowercase + digits + special;

  let password = "";
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += digits[crypto.randomInt(digits.length)];
  password += special[crypto.randomInt(special.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export async function createUser(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "No autorizado",
        data: {},
      };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return {
        success: false,
        message: "No tenés permisos para crear usuarios",
        data: {},
      };
    }

    const parsed = v.safeParse(CreateUserSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const { name, email, role } = parsed.output;

    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser) {
      return {
        success: false,
        message: "Ya existe un usuario con ese correo electrónico",
        data: {},
      };
    }

    const tempPassword = generateTempPassword();

    const assignedRole = role ?? "empleado";

    const signUpResult = await auth.api.createUser({
      body: {
        name,
        email,
        password: tempPassword,
        role: assignedRole,
        data: {
          mustChangePassword: true,
        },
      },
    });

    if (!signUpResult) {
      return {
        success: false,
        message: "Error al crear el usuario",
        data: {},
      };
    }

    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const html = emailService.buildWelcomeEmailHtml({
      name,
      email,
      tempPassword,
      loginUrl: `${baseUrl}/login`,
    });

    const emailSent = await emailService.sendEmail({
      to: email,
      subject: "Bienvenido/a a Jivis — Sistema de RRHH",
      html,
    });

    if (!emailSent) {
      logger.warn("USER", `Usuario creado pero correo no enviado. Credenciales:`, {
        email,
        tempPassword,
      });
    }

    logger.info("USER", `Usuario creado: ${email} (rol: ${assignedRole})`);

    return {
      success: true,
      message: emailSent
        ? "Usuario creado exitosamente. Se envió un correo con las credenciales."
        : "Usuario creado exitosamente. No se pudo enviar el correo — revisá los logs para ver las credenciales temporales.",
      data: { email },
    };
  } catch (error) {
    logger.error("USER", "Error al crear usuario:", error);
    return {
      success: false,
      message: "Error al crear el usuario",
      data: {},
    };
  }
}
