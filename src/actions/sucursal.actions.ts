"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { sucursal } from "@/db/schema/sucursal.schema";
import { eq, ilike, or } from "drizzle-orm";
import * as v from "valibot";
import {
  CreateSucursalSchema,
  UpdateSucursalSchema,
} from "@/lib/validations/sucursal";
import { UpdateGeocercaSchema } from "@/lib/validations/asistencia";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { registrarAuditoria } from "@/lib/auditoria";

export async function getSucursales(
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
        .from(sucursal)
        .where(
          or(
            ilike(sucursal.nombre, `%${search}%`),
            ilike(sucursal.direccion, `%${search}%`),
          ),
        )
        .orderBy(sucursal.nombre);
    } else {
      results = await db.select().from(sucursal).orderBy(sucursal.nombre);
    }

    return {
      success: true,
      message: "Sucursales obtenidas exitosamente",
      data: { sucursales: results },
    };
  } catch (error) {
    logger.error("SUCURSAL", "Error al obtener sucursales:", error);
    return { success: false, message: "Error al obtener sucursales", data: {} };
  }
}

export async function getSucursalById(
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
      .from(sucursal)
      .where(eq(sucursal.id, id))
      .limit(1);

    if (!result) {
      return { success: false, message: "Sucursal no encontrada", data: {} };
    }

    return {
      success: true,
      message: "Sucursal obtenida exitosamente",
      data: { sucursal: result },
    };
  } catch (error) {
    logger.error("SUCURSAL", "Error al obtener sucursal:", error);
    return { success: false, message: "Error al obtener sucursal", data: {} };
  }
}

export async function createSucursal(
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
      return { success: false, message: "No tenés permisos para crear sucursales", data: {} };
    }

    const parsed = v.safeParse(CreateSucursalSchema, formData);
    if (!parsed.success) {
      return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };
    }

    const { nombre, direccion, telefono } = parsed.output;

    const [existing] = await db
      .select({ id: sucursal.id })
      .from(sucursal)
      .where(eq(sucursal.nombre, nombre))
      .limit(1);

    if (existing) {
      return { success: false, message: "Ya existe una sucursal con ese nombre", data: {} };
    }

    const [newSucursal] = await db
      .insert(sucursal)
      .values({ nombre, direccion, telefono })
      .returning();

    revalidatePath("/dashboard/sucursales");

    logger.info("SUCURSAL", `Sucursal creada: ${nombre}`);

    await registrarAuditoria({
      tabla: "sucursal",
      registroId: newSucursal.id,
      accion: "crear",
      despues: newSucursal,
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Sucursal creada exitosamente",
      data: { sucursal: newSucursal },
    };
  } catch (error) {
    logger.error("SUCURSAL", "Error al crear sucursal:", error);
    return { success: false, message: "Error al crear sucursal", data: {} };
  }
}

export async function updateSucursal(
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
      return { success: false, message: "No tenés permisos para editar sucursales", data: {} };
    }

    const parsed = v.safeParse(UpdateSucursalSchema, formData);
    if (!parsed.success) {
      return { success: false, message: "Datos inválidos", data: { errors: parsed.issues } };
    }

    const { id, ...updates } = parsed.output;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: false, message: "No hay datos para actualizar", data: {} };
    }

    const [updated] = await db
      .update(sucursal)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(eq(sucursal.id, id))
      .returning();

    if (!updated) {
      return { success: false, message: "Sucursal no encontrada", data: {} };
    }

    revalidatePath("/dashboard/sucursales");

    logger.info("SUCURSAL", `Sucursal actualizada: ${id}`);

    await registrarAuditoria({
      tabla: "sucursal",
      registroId: id,
      accion: "editar",
      despues: updated,
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Sucursal actualizada exitosamente",
      data: { sucursal: updated },
    };
  } catch (error) {
    logger.error("SUCURSAL", "Error al actualizar sucursal:", error);
    return { success: false, message: "Error al actualizar sucursal", data: {} };
  }
}

export async function toggleSucursalEstado(
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
      return { success: false, message: "Solo un administrador puede desactivar sucursales", data: {} };
    }

    const [current] = await db
      .select({ estado: sucursal.estado })
      .from(sucursal)
      .where(eq(sucursal.id, id))
      .limit(1);

    if (!current) {
      return { success: false, message: "Sucursal no encontrada", data: {} };
    }

    const nuevoEstado = current.estado === "activa" ? "inactiva" : "activa";

    await db
      .update(sucursal)
      .set({ estado: nuevoEstado, updatedAt: new Date() })
      .where(eq(sucursal.id, id));

    revalidatePath("/dashboard/sucursales");

    logger.info("SUCURSAL", `Sucursal ${id} → ${nuevoEstado}`);

    await registrarAuditoria({
      tabla: "sucursal",
      registroId: id,
      accion: "editar",
      despues: { estado: nuevoEstado },
      antes: { estado: current.estado },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: `Sucursal ${nuevoEstado === "activa" ? "activada" : "desactivada"} exitosamente`,
      data: {},
    };
  } catch (error) {
    logger.error("SUCURSAL", "Error al cambiar estado de sucursal:", error);
    return { success: false, message: "Error al cambiar estado", data: {} };
  }
}

export async function updateGeocerca(
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
      return {
        success: false,
        message: "No tenés permisos para editar geocercas",
        data: {},
      };
    }

    const parsed = v.safeParse(UpdateGeocercaSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    if (
      data.geocercaActiva &&
      (data.latitud == null || data.longitud == null)
    ) {
      return {
        success: false,
        message:
          "Para activar la geocerca debés indicar latitud y longitud.",
        data: {},
      };
    }

    const [antes] = await db
      .select({
        latitud: sucursal.latitud,
        longitud: sucursal.longitud,
        radioMetros: sucursal.radioMetros,
        geocercaActiva: sucursal.geocercaActiva,
        tipoGeocerca: sucursal.tipoGeocerca,
      })
      .from(sucursal)
      .where(eq(sucursal.id, data.sucursalId))
      .limit(1);

    if (!antes) {
      return { success: false, message: "Sucursal no encontrada", data: {} };
    }

    const [updated] = await db
      .update(sucursal)
      .set({
        latitud: data.latitud ?? null,
        longitud: data.longitud ?? null,
        radioMetros: data.radioMetros,
        geocercaActiva: data.geocercaActiva,
        updatedAt: new Date(),
      })
      .where(eq(sucursal.id, data.sucursalId))
      .returning();

    if (!updated) {
      return { success: false, message: "Sucursal no encontrada", data: {} };
    }

    revalidatePath("/dashboard/sucursales");

    logger.info("SUCURSAL", `Geocerca actualizada: ${updated.id}`);

    await registrarAuditoria({
      tabla: "sucursal",
      registroId: updated.id,
      accion: "editar",
      antes: antes as Record<string, unknown>,
      despues: {
        latitud: updated.latitud,
        longitud: updated.longitud,
        radioMetros: updated.radioMetros,
        geocercaActiva: updated.geocercaActiva,
        tipoGeocerca: updated.tipoGeocerca,
      },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Geocerca actualizada",
      data: { sucursal: updated },
    };
  } catch (error) {
    logger.error("SUCURSAL", "Error al actualizar geocerca:", error);
    return {
      success: false,
      message: "Error al actualizar geocerca",
      data: {},
    };
  }
}
