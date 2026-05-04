"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { tramoRenta } from "@/db/schema/tramo-renta.schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { CrearTramoRentaSchema } from "@/lib/validations/planilla";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

const UpdateTramoRentaSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  limiteInferior: v.optional(v.pipe(v.string(), v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido."))),
  limiteSuperior: v.optional(v.pipe(v.string(), v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido."))),
  porcentaje: v.optional(v.pipe(v.string(), v.regex(/^\d+(\.\d{1,2})?$/, "Porcentaje inválido."))),
  montoExcedente: v.optional(v.pipe(v.string(), v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido."))),
  descripcion: v.optional(v.pipe(v.string(), v.maxLength(200, "Máximo 200 caracteres."))),
});

export async function getTramosRenta(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const tramos = await db.select().from(tramoRenta).orderBy(tramoRenta.limiteInferior);

    return { success: true, message: "Tramos obtenidos", data: { tramos } };
  } catch (error) {
    logger.error("TRAMO_RENTA", "Error al obtener tramos:", error);
    return { success: false, message: "Error al obtener tramos", data: {} };
  }
}

export async function createTramoRenta(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const parsed = v.safeParse(CrearTramoRentaSchema, formData);
    if (!parsed.success) return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };

    const data = parsed.output;
    await db.insert(tramoRenta).values({
      limiteInferior: data.limiteInferior,
      limiteSuperior: data.limiteSuperior ?? null,
      porcentaje: data.porcentaje,
      montoExcedente: data.montoExcedente,
      descripcion: data.descripcion ?? null,
    });

    revalidatePath("/dashboard/settings");
    return { success: true, message: "Tamo de renta creado exitosamente", data: {} };
  } catch (error) {
    logger.error("TRAMO_RENTA", "Error al crear tramo:", error);
    return { success: false, message: "Error al crear tramo", data: {} };
  }
}

export async function updateTramoRenta(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const parsed = v.safeParse(UpdateTramoRentaSchema, formData);
    if (!parsed.success) return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };

    const { id, ...updates } = parsed.output;
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));

    if (Object.keys(cleanUpdates).length === 0) return { success: false, message: "No hay datos para actualizar", data: {} };

    await db.update(tramoRenta).set({ ...cleanUpdates, updatedAt: new Date() }).where(eq(tramoRenta.id, id));

    revalidatePath("/dashboard/settings");
    return { success: true, message: "Tramo actualizado exitosamente", data: {} };
  } catch (error) {
    logger.error("TRAMO_RENTA", "Error al actualizar tramo:", error);
    return { success: false, message: "Error al actualizar tramo", data: {} };
  }
}

export async function toggleTramoRenta(id: string): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const [current] = await db.select({ activo: tramoRenta.activo }).from(tramoRenta).where(eq(tramoRenta.id, id)).limit(1);
    if (!current) return { success: false, message: "Tramo no encontrado", data: {} };

    await db.update(tramoRenta).set({ activo: !current.activo, updatedAt: new Date() }).where(eq(tramoRenta.id, id));

    revalidatePath("/dashboard/settings");
    return { success: true, message: `Tramo ${current.activo ? "desactivado" : "activado"} exitosamente`, data: {} };
  } catch (error) {
    logger.error("TRAMO_RENTA", "Error al cambiar estado:", error);
    return { success: false, message: "Error al cambiar estado", data: {} };
  }
}
