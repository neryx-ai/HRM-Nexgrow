"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { configuracionDeduccion } from "@/db/schema/configuracion-deduccion.schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { clearDeduccionesCache } from "@/lib/planilla";

const UpdateDeduccionSchema = v.object({
  id: v.pipe(v.string("El ID es requerido."), v.nonEmpty()),
  valor: v.pipe(
    v.string("El valor es requerido."),
    v.nonEmpty("Ingresá el valor."),
    v.regex(/^\d+(\.\d{1,6})?$/, "Valor numérico inválido."),
  ),
});

const CreateDeduccionSchema = v.object({
  clave: v.pipe(
    v.string("La clave es requerida."),
    v.nonEmpty("Ingresá la clave."),
    v.maxLength(60, "Máximo 60 caracteres."),
    v.regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Clave inválida. Solo letras, números y guión bajo."),
  ),
  valor: v.pipe(
    v.string("El valor es requerido."),
    v.nonEmpty("Ingresá el valor."),
    v.regex(/^\d+(\.\d{1,6})?$/, "Valor numérico inválido."),
  ),
  descripcion: v.optional(v.pipe(v.string(), v.maxLength(200, "Máximo 200 caracteres."))),
});

export async function getDeduccionesConfig(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const deducciones = await db.select().from(configuracionDeduccion).orderBy(configuracionDeduccion.clave);

    return { success: true, message: "Deducciones obtenidas", data: { deducciones } };
  } catch (error) {
    logger.error("CONFIG", "Error al obtener deducciones:", error);
    return { success: false, message: "Error al obtener deducciones", data: {} };
  }
}

export async function updateDeduccion(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const parsed = v.safeParse(UpdateDeduccionSchema, formData);
    if (!parsed.success) return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };

    const { id, valor } = parsed.output;
    await db.update(configuracionDeduccion).set({ valor, updatedAt: new Date() }).where(eq(configuracionDeduccion.id, id));

    clearDeduccionesCache();

    revalidatePath("/dashboard/settings");
    return { success: true, message: "Deducción actualizada exitosamente", data: {} };
  } catch (error) {
    logger.error("CONFIG", "Error al actualizar deducción:", error);
    return { success: false, message: "Error al actualizar deducción", data: {} };
  }
}

export async function createDeduccion(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const parsed = v.safeParse(CreateDeduccionSchema, formData);
    if (!parsed.success) return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };

    const { clave, valor, descripcion } = parsed.output;

    const [existing] = await db.select({ id: configuracionDeduccion.id }).from(configuracionDeduccion).where(eq(configuracionDeduccion.clave, clave)).limit(1);
    if (existing) return { success: false, message: "Ya existe una deducción con esa clave", data: {} };

    const [newDeduccion] = await db.insert(configuracionDeduccion).values({
      clave,
      valor,
      descripcion: descripcion ?? null,
    }).returning();

    clearDeduccionesCache();

    revalidatePath("/dashboard/settings");
    return { success: true, message: "Deducción creada exitosamente", data: { deduccion: newDeduccion } };
  } catch (error) {
    logger.error("CONFIG", "Error al crear deducción:", error);
    return { success: false, message: "Error al crear deducción", data: {} };
  }
}

export async function getConfiguracionGeneral(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") return { success: false, message: "Solo administradores", data: {} };

    const deducciones = await db.select().from(configuracionDeduccion).orderBy(configuracionDeduccion.clave);

    return { success: true, message: "Configuración obtenida", data: { deducciones } };
  } catch (error) {
    logger.error("CONFIG", "Error al obtener configuración:", error);
    return { success: false, message: "Error al obtener configuración", data: {} };
  }
}
