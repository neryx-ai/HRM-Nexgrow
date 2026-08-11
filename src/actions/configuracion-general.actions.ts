"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { configuracionGeneral } from "@/db/schema/configuracion-general.schema";
import { ActionResponse } from "./types";
import { registrarAuditoria } from "@/lib/auditoria";
import { logger } from "@/lib/logger";

export async function getConfiguracionesGenerales(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }
    const rows = await db.select().from(configuracionGeneral);
    return {
      success: true,
      message: "Configuraciones obtenidas",
      data: { configuraciones: rows },
    };
  } catch (error) {
    logger.error("CONFIG_GENERAL", "Error al obtener configuraciones:", error);
    return { success: false, message: "Error al obtener", data: {} };
  }
}

export async function updateConfiguracionGeneral(
  clave: string,
  valor: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }
    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") {
      return {
        success: false,
        message: "Solo el administrador puede modificar la configuración",
        data: {},
      };
    }

    const [existing] = await db
      .select()
      .from(configuracionGeneral)
      .where(eq(configuracionGeneral.clave, clave))
      .limit(1);

    if (!existing) {
      return {
        success: false,
        message: `La clave "${clave}" no existe`,
        data: {},
      };
    }

    await db
      .update(configuracionGeneral)
      .set({ valor, actualizadoPor: session.user.id })
      .where(eq(configuracionGeneral.clave, clave));

    await registrarAuditoria({
      tabla: "configuracion_general",
      registroId: clave,
      accion: "editar",
      antes: { valor: existing.valor },
      despues: { valor },
      realizadoPor: session.user.id,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/vacations");
    revalidatePath("/dashboard/days-off");

    return { success: true, message: "Configuración actualizada", data: {} };
  } catch (error) {
    logger.error("CONFIG_GENERAL", "Error al actualizar:", error);
    return { success: false, message: "Error al actualizar", data: {} };
  }
}
