"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { puesto } from "@/db/schema/puesto.schema";
import { eq, ilike } from "drizzle-orm";
import * as v from "valibot";
import {
  CreatePuestoSchema,
  UpdatePuestoSchema,
} from "@/lib/validations/puesto";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { registrarAuditoria } from "@/lib/auditoria";

export async function getPuestos(
  search?: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    let results;

    if (search) {
      results = await db
        .select()
        .from(puesto)
        .where(ilike(puesto.nombre, `%${search}%`))
        .orderBy(puesto.nombre);
    } else {
      results = await db.select().from(puesto).orderBy(puesto.nombre);
    }

    return {
      success: true,
      message: "Puestos obtenidos exitosamente",
      data: { puestos: results },
    };
  } catch (error) {
    logger.error("PUESTO", "Error al obtener puestos:", error);
    return { success: false, message: "Error al obtener puestos", data: {} };
  }
}

export async function getPuestoById(
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
      .select()
      .from(puesto)
      .where(eq(puesto.id, id))
      .limit(1);

    if (!result) {
      return { success: false, message: "Puesto no encontrado", data: {} };
    }

    return {
      success: true,
      message: "Puesto obtenido exitosamente",
      data: { puesto: result },
    };
  } catch (error) {
    logger.error("PUESTO", "Error al obtener puesto:", error);
    return { success: false, message: "Error al obtener puesto", data: {} };
  }
}

export async function createPuesto(
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
      return { success: false, message: "No tenés permisos para crear puestos", data: {} };
    }

    const parsed = v.safeParse(CreatePuestoSchema, formData);
    if (!parsed.success) {
      return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };
    }

    const { nombre, descripcion, salarioBase } = parsed.output;

    const [existing] = await db
      .select({ id: puesto.id })
      .from(puesto)
      .where(eq(puesto.nombre, nombre))
      .limit(1);

    if (existing) {
      return { success: false, message: "Ya existe un puesto con ese nombre", data: {} };
    }

    const [newPuesto] = await db
      .insert(puesto)
      .values({ nombre, descripcion, salarioBase: String(salarioBase) })
      .returning();

    revalidatePath("/dashboard/puestos");

    logger.info("PUESTO", `Puesto creado: ${nombre}`);

    await registrarAuditoria({
      tabla: "puesto",
      registroId: newPuesto.id,
      accion: "crear",
      despues: newPuesto,
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Puesto creado exitosamente",
      data: { puesto: newPuesto },
    };
  } catch (error) {
    logger.error("PUESTO", "Error al crear puesto:", error);
    return { success: false, message: "Error al crear puesto", data: {} };
  }
}

export async function updatePuesto(
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
      return { success: false, message: "No tenés permisos para editar puestos", data: {} };
    }

    const parsed = v.safeParse(UpdatePuestoSchema, formData);
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
      .update(puesto)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(eq(puesto.id, id))
      .returning();

    if (!updated) {
      return { success: false, message: "Puesto no encontrado", data: {} };
    }

    revalidatePath("/dashboard/puestos");

    logger.info("PUESTO", `Puesto actualizado: ${id}`);

    await registrarAuditoria({
      tabla: "puesto",
      registroId: id,
      accion: "editar",
      despues: updated,
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Puesto actualizado exitosamente",
      data: { puesto: updated },
    };
  } catch (error) {
    logger.error("PUESTO", "Error al actualizar puesto:", error);
    return { success: false, message: "Error al actualizar puesto", data: {} };
  }
}

export async function deletePuesto(
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
    if (userRole !== "admin") {
      return { success: false, message: "Solo un administrador puede eliminar puestos", data: {} };
    }

    const [deleted] = await db
      .delete(puesto)
      .where(eq(puesto.id, id))
      .returning({ id: puesto.id });

    if (!deleted) {
      return { success: false, message: "Puesto no encontrado", data: {} };
    }

    revalidatePath("/dashboard/puestos");

    logger.info("PUESTO", `Puesto eliminado: ${id}`);

    await registrarAuditoria({
      tabla: "puesto",
      registroId: id,
      accion: "eliminar",
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Puesto eliminado exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PUESTO", "Error al eliminar puesto:", error);
    return { success: false, message: "Error al eliminar puesto. Puede tener empleados asignados.", data: {} };
  }
}
