"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { feriado } from "@/db/schema/feriado.schema";
import { saldoVacaciones } from "@/db/schema/saldo-vacaciones.schema";
import { solicitudVacacion } from "@/db/schema/solicitud-vacacion.schema";
import { empleado } from "@/db/schema/empleado.schema";
import { user } from "@/db/schema/auth.schema";
import { eq, and, desc, sql } from "drizzle-orm";
import * as v from "valibot";
import {
  CrearFeriadoSchema,
  SolicitarVacacionSchema,
  AprobarRechazarVacacionSchema,
} from "@/lib/validations/vacacion";
import { calcularDiasHabiles } from "@/lib/vacaciones";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

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

export async function eliminarFeriado(
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
      return {
        success: false,
        message: "No tenés permisos para eliminar feriados",
        data: {},
      };
    }

    await db.delete(feriado).where(eq(feriado.id, id));

    revalidatePath("/dashboard/vacations");

    return {
      success: true,
      message: "Feriado eliminado exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("FERIADO", "Error al eliminar feriado:", error);
    return { success: false, message: "Error al eliminar feriado", data: {} };
  }
}

export async function getSaldoVacacion(
  empleadoId?: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    let targetEmpleadoId = empleadoId;

    if (userRole === "empleado") {
      const [emp] = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(eq(empleado.userId, session.user.id))
        .limit(1);

      if (!emp) {
        return {
          success: false,
          message: "No se encontró el perfil de empleado",
          data: {},
        };
      }
      targetEmpleadoId = emp.id;
    }

    if (!targetEmpleadoId) {
      return {
        success: false,
        message: "ID de empleado requerido",
        data: {},
      };
    }

    const saldos = await db
      .select()
      .from(saldoVacaciones)
      .where(eq(saldoVacaciones.empleadoId, targetEmpleadoId))
      .orderBy(desc(saldoVacaciones.periodoInicio));

    return {
      success: true,
      message: "Saldos obtenidos exitosamente",
      data: { saldos },
    };
  } catch (error) {
    logger.error("VACACION", "Error al obtener saldo:", error);
    return { success: false, message: "Error al obtener saldo", data: {} };
  }
}

export async function getSolicitudesVacacion(
  filtroEstado?: string,
  filtroEmpleadoId?: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    const conditions = [];

    if (filtroEstado) {
      conditions.push(eq(solicitudVacacion.estado, filtroEstado));
    }

    if (userRole === "empleado") {
      const [emp] = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(eq(empleado.userId, session.user.id))
        .limit(1);

      if (!emp) {
        return {
          success: false,
          message: "No se encontró el perfil de empleado",
          data: {},
        };
      }
      conditions.push(eq(solicitudVacacion.empleadoId, emp.id));
    } else if (filtroEmpleadoId) {
      conditions.push(eq(solicitudVacacion.empleadoId, filtroEmpleadoId));
    }

    const solicitudes = await db
      .select({
        solicitud: solicitudVacacion,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        aprobadoPorNombre: user.name,
      })
      .from(solicitudVacacion)
      .innerJoin(empleado, eq(solicitudVacacion.empleadoId, empleado.id))
      .leftJoin(user, eq(solicitudVacacion.aprobadoPor, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(solicitudVacacion.createdAt));

    return {
      success: true,
      message: "Solicitudes obtenidas exitosamente",
      data: { solicitudes },
    };
  } catch (error) {
    logger.error("VACACION", "Error al obtener solicitudes:", error);
    return {
      success: false,
      message: "Error al obtener solicitudes",
      data: {},
    };
  }
}

export async function solicitarVacacion(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const parsed = v.safeParse(SolicitarVacacionSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const fechaInicio = new Date(data.fechaInicio + "T00:00:00");
    const fechaFin = new Date(data.fechaFin + "T00:00:00");
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaInicio < hoy) {
      return {
        success: false,
        message: "La fecha de inicio no puede ser anterior a hoy",
        data: {},
      };
    }

    if (fechaFin < fechaInicio) {
      return {
        success: false,
        message: "La fecha de fin no puede ser anterior a la fecha de inicio",
        data: {},
      };
    }

    const [emp] = await db
      .select({ id: empleado.id })
      .from(empleado)
      .where(eq(empleado.userId, session.user.id))
      .limit(1);

    if (!emp) {
      return {
        success: false,
        message: "No se encontró el perfil de empleado",
        data: {},
      };
    }

    const diasHabiles = await calcularDiasHabiles(data.fechaInicio, data.fechaFin);

    if (diasHabiles === 0) {
      return {
        success: false,
        message: "El rango de fechas no contiene días hábiles",
        data: {},
      };
    }

    const [saldo] = await db
      .select()
      .from(saldoVacaciones)
      .where(
        and(
          eq(saldoVacaciones.empleadoId, emp.id),
          sql`${saldoVacaciones.diasDisponibles} - ${saldoVacaciones.diasPendientes} >= ${diasHabiles}`,
        ),
      )
      .limit(1);

    if (!saldo) {
      return {
        success: false,
        message: `No tenés suficientes días disponibles. Solicitás ${diasHabiles} días hábiles.`,
        data: {},
      };
    }

    await db.insert(solicitudVacacion).values({
      empleadoId: emp.id,
      saldoVacacionId: saldo.id,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      diasHabiles,
      nota: data.nota,
    });

    await db
      .update(saldoVacaciones)
      .set({
        diasPendientes: sql`${saldoVacaciones.diasPendientes} + ${diasHabiles}`,
      })
      .where(eq(saldoVacaciones.id, saldo.id));

    revalidatePath("/dashboard/vacations");

    logger.info("VACACION", `Solicitud creada: ${emp.id}, ${diasHabiles} días`);

    return {
      success: true,
      message: `Solicitud enviada exitosamente (${diasHabiles} días hábiles)`,
      data: {},
    };
  } catch (error) {
    logger.error("VACACION", "Error al solicitar vacación:", error);
    return {
      success: false,
      message: "Error al solicitar vacación",
      data: {},
    };
  }
}

export async function aprobarRechazarVacacion(
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
        message: "No tenés permisos para aprobar o rechazar solicitudes",
        data: {},
      };
    }

    const parsed = v.safeParse(AprobarRechazarVacacionSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [solicitud] = await db
      .select()
      .from(solicitudVacacion)
      .where(eq(solicitudVacacion.id, data.solicitudId))
      .limit(1);

    if (!solicitud) {
      return {
        success: false,
        message: "Solicitud no encontrada",
        data: {},
      };
    }

    if (solicitud.estado !== "pendiente") {
      return {
        success: false,
        message: "La solicitud ya fue procesada",
        data: {},
      };
    }

    const nuevoEstado = data.accion === "aprobar" ? "aprobada" : "rechazada";

    await db
      .update(solicitudVacacion)
      .set({
        estado: nuevoEstado,
        aprobadoPor: session.user.id,
        aprobadoEn: new Date(),
        motivoRechazo: data.accion === "rechazar" ? data.motivoRechazo : null,
      })
      .where(eq(solicitudVacacion.id, data.solicitudId));

    const [saldo] = await db
      .select()
      .from(saldoVacaciones)
      .where(eq(saldoVacaciones.id, solicitud.saldoVacacionId))
      .limit(1);

    if (saldo) {
      if (data.accion === "aprobar") {
        await db
          .update(saldoVacaciones)
          .set({
            diasPendientes: sql`${saldoVacaciones.diasPendientes} - ${solicitud.diasHabiles}`,
            diasUsados: sql`${saldoVacaciones.diasUsados} + ${solicitud.diasHabiles}`,
            diasDisponibles: sql`${saldoVacaciones.diasDisponibles} - ${solicitud.diasHabiles}`,
          })
          .where(eq(saldoVacaciones.id, saldo.id));

        const { registroAsistencia } = await import("@/db/schema/registro-asistencia.schema");
        let fechaActual = new Date(solicitud.fechaInicio + "T00:00:00");
        const fechaFin = new Date(solicitud.fechaFin + "T00:00:00");

        while (fechaActual <= fechaFin) {
          const diaSemana = fechaActual.getDay();
          if (diaSemana !== 0 && diaSemana !== 6) {
            const fechaStr = fechaActual.toISOString().split("T")[0];
            await db.insert(registroAsistencia).values({
              empleadoId: solicitud.empleadoId,
              tipo: "vacacion",
              timestamp: new Date(fechaStr + "T08:00:00"),
              fuente: "sistema",
              registradoPor: session.user.id,
              nota: `Vacación aprobada: ${solicitud.fechaInicio} a ${solicitud.fechaFin}`,
            });
          }
          fechaActual.setDate(fechaActual.getDate() + 1);
        }
      } else {
        await db
          .update(saldoVacaciones)
          .set({
            diasPendientes: sql`${saldoVacaciones.diasPendientes} - ${solicitud.diasHabiles}`,
          })
          .where(eq(saldoVacaciones.id, saldo.id));
      }
    }

    revalidatePath("/dashboard/vacations");

    logger.info(
      "VACACION",
      `Solicitud ${data.solicitudId} ${nuevoEstado} por ${session.user.id}`,
    );

    return {
      success: true,
      message:
        data.accion === "aprobar"
          ? "Solicitud aprobada exitosamente"
          : "Solicitud rechazada",
      data: {},
    };
  } catch (error) {
    logger.error("VACACION", "Error al procesar solicitud:", error);
    return {
      success: false,
      message: "Error al procesar solicitud",
      data: {},
    };
  }
}

export async function inicializarSaldoVacacion(
  empleadoId: string,
  fechaIngreso: string,
): Promise<void> {
  const ingreso = new Date(fechaIngreso + "T00:00:00");
  const periodoInicio = new Date(ingreso);
  const periodoFin = new Date(ingreso);
  periodoFin.setFullYear(periodoFin.getFullYear() + 1);
  periodoFin.setDate(periodoFin.getDate() - 1);

  await db.insert(saldoVacaciones).values({
    empleadoId,
    periodoInicio: fechaIngreso,
    periodoFin: periodoFin.toISOString().split("T")[0],
    diasOtorgados: 0,
    diasDisponibles: 0,
    diasUsados: 0,
    diasPendientes: 0,
  });
}

export async function getResumenVacaciones(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";

    if (userRole === "empleado") {
      const [emp] = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(eq(empleado.userId, session.user.id))
        .limit(1);

      if (!emp) {
        return {
          success: false,
          message: "No se encontró el perfil de empleado",
          data: {},
        };
      }

      const saldos = await db
        .select()
        .from(saldoVacaciones)
        .where(eq(saldoVacaciones.empleadoId, emp.id))
        .orderBy(desc(saldoVacaciones.periodoInicio));

      const solicitudes = await db
        .select({
          solicitud: solicitudVacacion,
          aprobadoPorNombre: user.name,
        })
        .from(solicitudVacacion)
        .leftJoin(user, eq(solicitudVacacion.aprobadoPor, user.id))
        .where(eq(solicitudVacacion.empleadoId, emp.id))
        .orderBy(desc(solicitudVacacion.createdAt));

      return {
        success: true,
        message: "Resumen obtenido exitosamente",
        data: { saldos, solicitudes, esEmpleado: true },
      };
    }

    const solicitudes = await db
      .select({
        solicitud: solicitudVacacion,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        aprobadoPorNombre: user.name,
      })
      .from(solicitudVacacion)
      .innerJoin(empleado, eq(solicitudVacacion.empleadoId, empleado.id))
      .leftJoin(user, eq(solicitudVacacion.aprobadoPor, user.id))
      .orderBy(desc(solicitudVacacion.createdAt));

    const feriadosResult = await db
      .select()
      .from(feriado)
      .orderBy(feriado.fecha);

    return {
      success: true,
      message: "Resumen obtenido exitosamente",
      data: { solicitudes, feriados: feriadosResult, esEmpleado: false },
    };
  } catch (error) {
    logger.error("VACACION", "Error al obtener resumen:", error);
    return { success: false, message: "Error al obtener resumen", data: {} };
  }
}

export async function cancelarSolicitudVacacion(
  solicitudId: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const [solicitud] = await db
      .select()
      .from(solicitudVacacion)
      .where(eq(solicitudVacacion.id, solicitudId))
      .limit(1);

    if (!solicitud) {
      return {
        success: false,
        message: "Solicitud no encontrada",
        data: {},
      };
    }

    if (solicitud.estado !== "pendiente") {
      return {
        success: false,
        message: "Solo se pueden cancelar solicitudes pendientes",
        data: {},
      };
    }

    const [emp] = await db
      .select({ id: empleado.id })
      .from(empleado)
      .where(eq(empleado.userId, session.user.id))
      .limit(1);

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole === "empleado" && (!emp || emp.id !== solicitud.empleadoId)) {
      return {
        success: false,
        message: "No podés cancelar esta solicitud",
        data: {},
      };
    }

    await db
      .update(solicitudVacacion)
      .set({ estado: "cancelada" })
      .where(eq(solicitudVacacion.id, solicitudId));

    const [saldo] = await db
      .select()
      .from(saldoVacaciones)
      .where(eq(saldoVacaciones.id, solicitud.saldoVacacionId))
      .limit(1);

    if (saldo) {
      await db
        .update(saldoVacaciones)
        .set({
          diasPendientes: sql`${saldoVacaciones.diasPendientes} - ${solicitud.diasHabiles}`,
        })
        .where(eq(saldoVacaciones.id, saldo.id));
    }

    revalidatePath("/dashboard/vacations");

    return {
      success: true,
      message: "Solicitud cancelada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("VACACION", "Error al cancelar solicitud:", error);
    return {
      success: false,
      message: "Error al cancelar solicitud",
      data: {},
    };
  }
}
