"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { user, account, session as sessionTable } from "@/db/schema/auth.schema";
import { and, desc, eq, ne } from "drizzle-orm";
import * as v from "valibot";
import { CreateUserSchema, UpdateUserEmailSchema } from "@/lib/validations/auth";
import { emailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import { registrarAuditoria } from "@/lib/auditoria";
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

export async function createUser(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) return { success: false, message: "No tenés permisos", data: {} };

    const parsed = v.safeParse(CreateUserSchema, formData);
    if (!parsed.success) return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };

    const { name, email, role } = parsed.output;

    const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (existingUser) return { success: false, message: "Ya existe un usuario con ese correo", data: {} };

    const tempPassword = generateTempPassword();
    const assignedRole = role ?? "empleado";

    const signUpResult = await auth.api.createUser({
      body: {
        name,
        email,
        password: tempPassword,
        role: assignedRole,
        data: { mustChangePassword: true },
      },
    });

    if (!signUpResult) return { success: false, message: "Error al crear el usuario", data: {} };

    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const html = emailService.buildWelcomeEmailHtml({ name, email, tempPassword, loginUrl: `${baseUrl}/login` });
    const emailSent = await emailService.sendEmail({ to: email, subject: "Bienvenido/a a Jivis — Sistema de RRHH", html });

    if (!emailSent) logger.warn("USER", `Usuario creado pero correo no enviado: ${email}`);

    logger.info("USER", `Usuario creado: ${email} (rol: ${assignedRole})`);

    await registrarAuditoria({
      tabla: "user",
      registroId: signUpResult.user?.id ?? email,
      accion: "crear",
      despues: { email, role: assignedRole },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: emailSent
        ? "Usuario creado exitosamente. Se envió un correo."
        : "Usuario creado. No se pudo enviar el correo — revisá los logs.",
      data: { email },
    };
  } catch (error) {
    logger.error("USER", "Error al crear usuario:", error);
    return { success: false, message: "Error al crear el usuario", data: {} };
  }
}

export async function listUsers(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    return { success: true, message: "Usuarios obtenidos", data: { users } };
  } catch (error) {
    logger.error("USER", "Error al listar usuarios:", error);
    return { success: false, message: "Error al listar usuarios", data: {} };
  }
}

export async function updateUserRole(userId: string, role: string): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    if (!["admin", "rrhh", "empleado"].includes(role)) return { success: false, message: "Rol inválido", data: {} };

    await db.update(user).set({ role }).where(eq(user.id, userId));

    logger.info("USER", `Usuario ${userId} → rol ${role}`);

    await registrarAuditoria({
      tabla: "user",
      registroId: userId,
      accion: "editar",
      despues: { role },
      realizadoPor: session.user.id,
    });

    return { success: true, message: "Rol actualizado exitosamente", data: {} };
  } catch (error) {
    logger.error("USER", "Error al actualizar rol:", error);
    return { success: false, message: "Error al actualizar rol", data: {} };
  }
}

export async function banUser(userId: string, reason?: string): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    await db.update(user).set({ banned: true, banReason: reason ?? null, updatedAt: new Date() }).where(eq(user.id, userId));

    logger.info("USER", `Usuario ${userId} baneado: ${reason ?? "sin motivo"}`);
    return { success: true, message: "Usuario baneado exitosamente", data: {} };
  } catch (error) {
    logger.error("USER", "Error al banear usuario:", error);
    return { success: false, message: "Error al banear usuario", data: {} };
  }
}

export async function unbanUser(userId: string): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    await db.update(user).set({ banned: false, banReason: null, updatedAt: new Date() }).where(eq(user.id, userId));

    logger.info("USER", `Usuario ${userId} desbaneado`);
    return { success: true, message: "Usuario desbaneado exitosamente", data: {} };
  } catch (error) {
    logger.error("USER", "Error al desbanear usuario:", error);
    return { success: false, message: "Error al desbanear usuario", data: {} };
  }
}

export async function resetUserPassword(userId: string): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    if (userId === session.user.id) {
      return { success: false, message: "No podés restablecer tu propia contraseña desde acá. Usá la página de perfil.", data: {} };
    }

    const [targetUser] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!targetUser) return { success: false, message: "Usuario no encontrado", data: {} };

    const tempPassword = generateTempPassword();

    await auth.api.setUserPassword({
      body: { newPassword: tempPassword, userId },
      headers: await headers(),
    });

    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));

    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const html = emailService.buildPasswordResetByAdminEmailHtml({
      name: targetUser.name,
      email: targetUser.email,
      tempPassword,
      loginUrl: `${baseUrl}/login`,
    });
    const emailSent = await emailService.sendEmail({
      to: targetUser.email,
      subject: "Tu contraseña fue restablecida — Jivis RRHH",
      html,
    });

    if (!emailSent) {
      logger.warn("USER", `Contraseña restablecida pero correo no enviado a ${targetUser.email}: ${tempPassword}`);
    }

    logger.info("USER", `Contraseña restablecida para ${userId} por ${session.user.id}`);

    await registrarAuditoria({
      tabla: "user",
      registroId: userId,
      accion: "editar",
      antes: { passwordReset: false },
      despues: { passwordReset: true },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: emailSent
        ? "Contraseña restablecida. Se envió un correo con la nueva contraseña temporal."
        : "Contraseña restablecida. No se pudo enviar el correo — revisá los logs.",
      data: { tempPassword: emailSent ? undefined : tempPassword },
    };
  } catch (error) {
    logger.error("USER", "Error al restablecer contraseña:", error);
    return { success: false, message: "Error al restablecer contraseña", data: {} };
  }
}

export async function updateUserEmail(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const parsed = v.safeParse(UpdateUserEmailSchema, formData);
    if (!parsed.success) {
      return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };
    }

    const { userId, email } = parsed.output;
    const normalizedEmail = email.toLowerCase().trim();

    if (userId === session.user.id) {
      return { success: false, message: "No podés cambiar tu propio email desde acá. Usá la página de perfil.", data: {} };
    }

    const [targetUser] = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!targetUser) return { success: false, message: "Usuario no encontrado", data: {} };

    if (targetUser.email.toLowerCase() === normalizedEmail) {
      return { success: false, message: "El nuevo email es igual al actual", data: {} };
    }

    const [emailTaken] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.email, normalizedEmail), ne(user.id, userId)))
      .limit(1);

    if (emailTaken) {
      return { success: false, message: "Ya existe otro usuario con ese correo electrónico", data: {} };
    }

    const oldEmail = targetUser.email;

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ email: normalizedEmail, emailVerified: true, updatedAt: new Date() })
        .where(eq(user.id, userId));

      await tx
        .update(account)
        .set({ accountId: normalizedEmail, updatedAt: new Date() })
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

      await tx.delete(sessionTable).where(eq(sessionTable.userId, userId));
    });

    logger.info("USER", `Email actualizado: ${userId} (${oldEmail} → ${normalizedEmail}) por ${session.user.id}`);

    await registrarAuditoria({
      tabla: "user",
      registroId: userId,
      accion: "editar",
      antes: { email: oldEmail },
      despues: { email: normalizedEmail },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Email actualizado. Las sesiones activas del usuario fueron revocadas.",
      data: { email: normalizedEmail },
    };
  } catch (error) {
    logger.error("USER", "Error al actualizar email:", error);
    return { success: false, message: "Error al actualizar el email", data: {} };
  }
}
