"use server";

import { db } from "@/db/drizzle";
import { auditoria } from "@/db/schema/auditoria.schema";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

export async function registrarAuditoria(params: {
  tabla: string;
  registroId: string;
  accion: "crear" | "editar" | "eliminar";
  antes?: unknown;
  despues?: unknown;
  realizadoPor: string;
}): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? null;

    await db.insert(auditoria).values({
      tabla: params.tabla,
      registroId: params.registroId,
      accion: params.accion,
      antes: params.antes ? (params.antes as object) : null,
      despues: params.despues ? (params.despues as object) : null,
      realizadoPor: params.realizadoPor,
      ipAddress,
    });
  } catch (error) {
    logger.error("AUDITORIA", "Error al registrar auditoría:", error);
  }
}
