"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { feriado } from "@/db/schema/feriado.schema";
import { eq, desc } from "drizzle-orm";
import * as v from "valibot";
import { CrearFeriadoSchema } from "@/lib/validations/vacacion";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

const UpdateFeriadoSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  fecha: v.optional(
    v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Usá AAAA-MM-DD.")),
  ),
  nombre: v.optional(v.pipe(v.string(), v.maxLength(150, "Máximo 150 caracteres."))),
  tipo: v.optional(v.pipe(v.string(), v.picklist(["nacional", "religioso", "opcional"]))),
});

export async function getFeriados(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const feriados = await db.select().from(feriado).orderBy(desc(feriado.fecha));

    return { success: true, message: "Feriados obtenidos", data: { feriados } };
  } catch (error) {
    logger.error("FERIADO", "Error al obtener feriados:", error);
    return { success: false, message: "Error al obtener feriados", data: {} };
  }
}

export async function createFeriado(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const parsed = v.safeParse(CrearFeriadoSchema, formData);
    if (!parsed.success) return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };

    const data = parsed.output;

    const [existing] = await db.select({ id: feriado.id }).from(feriado).where(eq(feriado.fecha, data.fecha)).limit(1);
    if (existing) return { success: false, message: "Ya existe un feriado en esa fecha", data: {} };

    const [newFeriado] = await db.insert(feriado).values({ fecha: data.fecha, nombre: data.nombre, tipo: data.tipo }).returning();

    revalidatePath("/dashboard/settings");
    return { success: true, message: "Feriado creado exitosamente", data: { feriado: newFeriado } };
  } catch (error) {
    logger.error("FERIADO", "Error al crear feriado:", error);
    return { success: false, message: "Error al crear feriado", data: {} };
  }
}

export async function updateFeriado(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const parsed = v.safeParse(UpdateFeriadoSchema, formData);
    if (!parsed.success) return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };

    const { id, ...updates } = parsed.output;
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));

    if (Object.keys(cleanUpdates).length === 0) return { success: false, message: "No hay datos para actualizar", data: {} };

    await db.update(feriado).set({ ...cleanUpdates, updatedAt: new Date() }).where(eq(feriado.id, id));

    revalidatePath("/dashboard/settings");
    return { success: true, message: "Feriado actualizado exitosamente", data: {} };
  } catch (error) {
    logger.error("FERIADO", "Error al actualizar feriado:", error);
    return { success: false, message: "Error al actualizar feriado", data: {} };
  }
}

export async function toggleFeriado(id: string): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const [current] = await db.select({ activo: feriado.activo }).from(feriado).where(eq(feriado.id, id)).limit(1);
    if (!current) return { success: false, message: "Feriado no encontrado", data: {} };

    await db.update(feriado).set({ activo: !current.activo, updatedAt: new Date() }).where(eq(feriado.id, id));

    revalidatePath("/dashboard/settings");
    return { success: true, message: `Feriado ${current.activo ? "desactivado" : "activado"} exitosamente`, data: {} };
  } catch (error) {
    logger.error("FERIADO", "Error al cambiar estado del feriado:", error);
    return { success: false, message: "Error al cambiar estado", data: {} };
  }
}
