"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { feriado } from "@/db/schema/feriado.schema";
import { saldoVacaciones } from "@/db/schema/saldo-vacaciones.schema";
import { eq, desc } from "drizzle-orm";
import * as v from "valibot";
import { CrearFeriadoSchema } from "@/lib/validations/vacacion";
import { diasDevengados } from "@/lib/calculo-meses";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

// ────────────────────────────────────────────────────────────────────────────
// NOTA: este archivo está en proceso de reemplazo por saldo-vacacion.actions.ts
// durante la Fase 1 del rediseño de vacaciones. Las funciones que dependían
// de la tabla solicitud_vacacion (ya eliminada) quedan como stubs que
// devuelven error explícito. La lógica real se reescribe en la Fase 2.
// Excepción: `inicializarSaldoVacacion` se implementó porque
// `empleado.actions.ts:230` la llama al crear un empleado y esperaba una
// inicialización real del cache de saldo_vacaciones.
// ────────────────────────────────────────────────────────────────────────────

const EN_REEMPLAZO =
  "Funcionalidad de solicitudes de vacaciones en rediseño. Usá el módulo de saldo-vacacion en su lugar.";

function stub(...args: unknown[]): ActionResponse {
  void args;
  return {
    success: false,
    message: EN_REEMPLAZO,
    data: {},
  };
}

export async function getFeriados(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const feriados = await db
      .select()
      .from(feriado)
      .orderBy(desc(feriado.fecha));

    return {
      success: true,
      message: "Feriados obtenidos exitosamente",
      data: { feriados },
    };
  } catch (error) {
    logger.error("FERIADO", "Error al obtener feriados:", error);
    return { success: false, message: "Error al obtener feriados", data: {} };
  }
}

export async function crearFeriado(
  ...args: unknown[]
): Promise<ActionResponse> {
  const formData = args[0];
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
        message: "No tenés permisos para crear feriados",
        data: {},
      };
    }

    const parsed = v.safeParse(CrearFeriadoSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [existing] = await db
      .select({ id: feriado.id })
      .from(feriado)
      .where(eq(feriado.fecha, data.fecha))
      .limit(1);

    if (existing) {
      return {
        success: false,
        message: "Ya existe un feriado en esa fecha",
        data: {},
      };
    }

    const [newFeriado] = await db
      .insert(feriado)
      .values({
        fecha: data.fecha,
        nombre: data.nombre,
        tipo: data.tipo,
      })
      .returning();

    revalidatePath("/dashboard/vacations");

    return {
      success: true,
      message: "Feriado creado exitosamente",
      data: { feriado: newFeriado },
    };
  } catch (error) {
    logger.error("FERIADO", "Error al crear feriado:", error);
    return { success: false, message: "Error al crear feriado", data: {} };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Stubs: funciones reescritas en Fase 2
// ────────────────────────────────────────────────────────────────────────────

export async function getSaldoVacacion(
  ...args: unknown[]
): Promise<ActionResponse> {
  return stub(...args);
}

export async function getSolicitudesVacacion(
  ...args: unknown[]
): Promise<ActionResponse> {
  return stub(...args);
}

export async function solicitarVacacion(
  ...args: unknown[]
): Promise<ActionResponse> {
  return stub(...args);
}

export async function aprobarRechazarVacacion(
  ...args: unknown[]
): Promise<ActionResponse> {
  return stub(...args);
}

export async function inicializarSaldoVacacion(
  empleadoId: string,
  fechaIngreso: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return { success: false, message: "No tenés permisos", data: {} };
    }

    if (!empleadoId || !fechaIngreso) {
      return { success: false, message: "Faltan datos del empleado", data: {} };
    }

    const devengados = diasDevengados(fechaIngreso);

    await db
      .insert(saldoVacaciones)
      .values({
        empleadoId,
        periodoInicio: fechaIngreso,
        periodoFin: "2099-12-31",
        diasOtorgados: 0,
        diasDisponibles: devengados,
        diasUsados: 0,
        ultimaActualizacion: new Date(),
        actualizadoPor: session.user.id,
      })
      .onConflictDoNothing({
        target: [saldoVacaciones.empleadoId, saldoVacaciones.periodoInicio],
      });

    return {
      success: true,
      message: "Saldo de vacaciones inicializado",
      data: { diasDevengados: devengados },
    };
  } catch (error) {
    logger.error("VACACION", "Error al inicializar saldo:", error);
    return { success: false, message: "Error al inicializar saldo", data: {} };
  }
}

export async function getResumenVacaciones(): Promise<ActionResponse> {
  return stub();
}

export async function cancelarSolicitudVacacion(
  ...args: unknown[]
): Promise<ActionResponse> {
  return stub(...args);
}

export async function getVacacionesEmpleado(): Promise<ActionResponse> {
  return stub();
}

export async function getHistorialMovimientos(): Promise<ActionResponse> {
  return stub();
}
