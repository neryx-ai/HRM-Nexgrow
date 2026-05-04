"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { empleado } from "@/db/schema/empleado.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { user } from "@/db/schema/auth.schema";
import { eq, ilike, or, and } from "drizzle-orm";
import * as v from "valibot";
import {
  CreateEmpleadoSchema,
  UpdateEmpleadoSchema,
} from "@/lib/validations/empleado";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { emailService } from "@/lib/email";
import { inicializarSaldoVacacion } from "@/actions/vacacion.actions";
import { registrarAuditoria } from "@/lib/auditoria";
import crypto from "crypto";

async function generateUniquePin(): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const pin = String(crypto.randomInt(100000, 999999));

    const [existing] = await db
      .select({ id: empleado.id })
      .from(empleado)
      .where(eq(empleado.pin, pin))
      .limit(1);

    if (!existing) return pin;
  }

  throw new Error("No se pudo generar un PIN único después de 100 intentos");
}

export async function getEmpleados(
  search?: string,
  sucursalId?: string,
  estado?: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(empleado.nombre, `%${search}%`),
          ilike(empleado.apellidos, `%${search}%`),
          ilike(empleado.cedula, `%${search}%`),
        ),
      );
    }

    if (sucursalId) {
      conditions.push(eq(empleado.sucursalId, sucursalId));
    }

    if (estado) {
      conditions.push(eq(empleado.estado, estado));
    }

    const results = await db
      .select({
        empleado,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
      })
      .from(empleado)
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .innerJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(empleado.nombre);

    return {
      success: true,
      message: "Empleados obtenidos exitosamente",
      data: { empleados: results },
    };
  } catch (error) {
    logger.error("EMPLEADO", "Error al obtener empleados:", error);
    return { success: false, message: "Error al obtener empleados", data: {} };
  }
}

export async function getEmpleadoById(
  id: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const [result] = await db
      .select({
        empleado,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
      })
      .from(empleado)
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .innerJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(eq(empleado.id, id))
      .limit(1);

    if (!result) {
      return { success: false, message: "Empleado no encontrado", data: {} };
    }

    return {
      success: true,
      message: "Empleado obtenido exitosamente",
      data: { ...result },
    };
  } catch (error) {
    logger.error("EMPLEADO", "Error al obtener empleado:", error);
    return { success: false, message: "Error al obtener empleado", data: {} };
  }
}

export async function createEmpleado(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return { success: false, message: "No tenés permisos para crear empleados", data: {} };
    }

    const parsed = v.safeParse(CreateEmpleadoSchema, formData);
    if (!parsed.success) {
      const validationErrors = parsed.issues.map(
        (issue) => `${issue.path?.map((p) => p.key).join(".") || "general"}: ${issue.message}`,
      );
      logger.error("EMPLEADO", "Validación falló al crear empleado:", validationErrors);
      logger.error("EMPLEADO", "Datos recibidos:", JSON.stringify(formData));
      return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };
    }

    const data = parsed.output;

    const [existingCedula] = await db
      .select({ id: empleado.id })
      .from(empleado)
      .where(eq(empleado.cedula, data.cedula))
      .limit(1);

    if (existingCedula) {
      return { success: false, message: "Ya existe un empleado con esa cédula", data: {} };
    }

    const [existingEmail] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, data.email))
      .limit(1);

    if (existingEmail) {
      return { success: false, message: "Ya existe un usuario con ese correo electrónico", data: {} };
    }

    const pin = await generateUniquePin();

    const tempPassword = generateTempPassword();

    const signUpResult = await auth.api.createUser({
      body: {
        name: `${data.nombre} ${data.apellidos}`,
        email: data.email,
        password: tempPassword,
        role: "empleado",
        data: {
          mustChangePassword: true,
          emailVerified: true,
        },
      },
    });

    if (!signUpResult) {
      return { success: false, message: "Error al crear la cuenta de usuario", data: {} };
    }

    const createdUserId = signUpResult.user?.id;

    const [newEmpleado] = await db
      .insert(empleado)
      .values({
        userId: createdUserId ?? null,
        sucursalId: data.sucursalId,
        puestoId: data.puestoId,
        nombre: data.nombre,
        apellidos: data.apellidos,
        cedula: data.cedula,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento,
        direccion: data.direccion,
        fechaIngreso: data.fechaIngreso,
        salarioBase: String(data.salarioBase),
        tipoJornada: data.tipoJornada,
        horasJornada: data.horasJornada,
        horaEntrada: data.horaEntrada,
        horaSalida: data.horaSalida,
        pin,
      })
      .returning();

    await inicializarSaldoVacacion(newEmpleado.id, data.fechaIngreso);

    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const html = emailService.buildWelcomeEmailHtml({
      name: `${data.nombre} ${data.apellidos}`,
      email: data.email,
      tempPassword,
      loginUrl: `${baseUrl}/login`,
    });

    const emailSent = await emailService.sendEmail({
      to: data.email,
      subject: "Bienvenido/a a Jivis — Sistema de RRHH",
      html,
    });

    if (!emailSent) {
      logger.warn("EMPLEADO", "Empleado creado pero correo no enviado", {
        email: data.email,
        tempPassword,
      });
    }

    revalidatePath("/dashboard/empleados");

    logger.info("EMPLEADO", `Empleado creado: ${data.nombre} ${data.apellidos} (PIN: ${pin})`);

    await registrarAuditoria({
      tabla: "empleado",
      registroId: newEmpleado.id,
      accion: "crear",
      despues: newEmpleado,
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: emailSent
        ? "Empleado creado exitosamente. Se envió un correo con las credenciales."
        : "Empleado creado. No se pudo enviar el correo — revisá los logs.",
      data: { empleado: newEmpleado, pin },
    };
  } catch (error) {
    logger.error("EMPLEADO", "Error al crear empleado:", error);
    return { success: false, message: "Error al crear empleado", data: {} };
  }
}

export async function updateEmpleado(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return { success: false, message: "No tenés permisos para editar empleados", data: {} };
    }

    const parsed = v.safeParse(UpdateEmpleadoSchema, formData);
    if (!parsed.success) {
      return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };
    }

    const { id, ...updates } = parsed.output;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        cleanUpdates[key] = key === "salarioBase" ? String(val) : val;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: false, message: "No hay datos para actualizar", data: {} };
    }

    const [updated] = await db
      .update(empleado)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(eq(empleado.id, id))
      .returning();

    if (!updated) {
      return { success: false, message: "Empleado no encontrado", data: {} };
    }

    revalidatePath("/dashboard/empleados");

    logger.info("EMPLEADO", `Empleado actualizado: ${id}`);

    await registrarAuditoria({
      tabla: "empleado",
      registroId: id,
      accion: "editar",
      despues: updated,
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Empleado actualizado exitosamente",
      data: { empleado: updated },
    };
  } catch (error) {
    logger.error("EMPLEADO", "Error al actualizar empleado:", error);
    return { success: false, message: "Error al actualizar empleado", data: {} };
  }
}

export async function toggleEmpleadoEstado(
  id: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return { success: false, message: "No tenés permisos para desactivar empleados", data: {} };
    }

    const [emp] = await db
      .select({ estado: empleado.estado, userId: empleado.userId })
      .from(empleado)
      .where(eq(empleado.id, id))
      .limit(1);

    if (!emp) {
      return { success: false, message: "Empleado no encontrado", data: {} };
    }

    const nuevoEstado = emp.estado === "activo" ? "inactivo" : "activo";

    await db
      .update(empleado)
      .set({ estado: nuevoEstado, updatedAt: new Date() })
      .where(eq(empleado.id, id));

    if (emp.userId && nuevoEstado === "inactivo") {
      await db
        .update(user)
        .set({ banned: true, banReason: "Empleado desactivado", updatedAt: new Date() })
        .where(eq(user.id, emp.userId));
    } else if (emp.userId && nuevoEstado === "activo") {
      await db
        .update(user)
        .set({ banned: false, banReason: null, updatedAt: new Date() })
        .where(eq(user.id, emp.userId));
    }

    revalidatePath("/dashboard/empleados");

    logger.info("EMPLEADO", `Empleado ${id} → ${nuevoEstado}`);

    await registrarAuditoria({
      tabla: "empleado",
      registroId: id,
      accion: "editar",
      despues: { estado: nuevoEstado },
      antes: { estado: emp.estado },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: `Empleado ${nuevoEstado === "activo" ? "activado" : "desactivado"} exitosamente`,
      data: {},
    };
  } catch (error) {
    logger.error("EMPLEADO", "Error al cambiar estado del empleado:", error);
    return { success: false, message: "Error al cambiar estado", data: {} };
  }
}

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
