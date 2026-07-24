"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { eq, and, desc, gte, lte, sql, ilike, or, inArray } from "drizzle-orm";
import * as v from "valibot";
import { empleado } from "@/db/schema/empleado.schema";
import { registroAsistencia } from "@/db/schema/registro-asistencia.schema";
import { resumenAsistenciaDiaria } from "@/db/schema/resumen-asistencia-diaria.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { notificacionGeo } from "@/db/schema/notificacion-geo.schema";
import { solicitudPersonal } from "@/db/schema/solicitud-personal.schema";
import { dispositivoQuiosco } from "@/db/schema/dispositivo-quiosco.schema";
import { planilla } from "@/db/schema/planilla.schema";
import { detallePlanilla } from "@/db/schema/detalle-planilla.schema";
import {
  MarcarAsistenciaSchema,
  RegistroManualSchema,
  CrearDispositivoSchema,
  SolicitudPersonalSchema,
  AprobarRechazarSolicitudPersonalSchema,
  ResolverNotificacionGeoSchema,
} from "@/lib/validations/asistencia";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { evaluarGeocerca, esCoordenadaValida } from "@/lib/geo";
import { getMiEmpleado } from "@/lib/empleado";
import crypto from "crypto";

const TOLERANCIA_RETRASO_MINUTOS = 15;
const COORDS_MAX_AGE_MS = 60_000;

export async function marcarAsistencia(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const parsed = v.safeParse(MarcarAsistenciaSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const { coords, dispositivoId } = parsed.output;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Necesitás iniciar sesión para marcar asistencia.",
        data: { code: "NO_AUTORIZADO" },
      };
    }

    const emp = await getMiEmpleado(session.user.id);
    if (!emp) {
      return {
        success: false,
        message: "No se encontró un perfil de empleado asociado.",
        data: {},
      };
    }

    if (emp.estado !== "activo") {
      return {
        success: false,
        message: "Tu cuenta de empleado no está activa. Contactá a RRHH.",
        data: {},
      };
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const [sucursalEmp] = await db
      .select()
      .from(sucursal)
      .where(eq(sucursal.id, emp.sucursalId))
      .limit(1);

    let distanciaSucursalM: number | null = null;
    let dentroGeocerca: boolean | null = null;
    let fueraDeGeocerca = false;
    let fuenteCoordenada: "gps" | "no-enviada" = "no-enviada";
    let latEmpleado: number | null = null;
    let lngEmpleado: number | null = null;
    let precisionMetros: number | null = null;

    if (coords) {
      if (Date.now() - coords.capturedAt > COORDS_MAX_AGE_MS) {
        return {
          success: false,
          message:
            "La ubicación enviada es muy antigua. Volvé a intentar y permití la captura ahora.",
          data: {},
        };
      }
      if (!esCoordenadaValida(coords.lat, coords.lng)) {
        return {
          success: false,
          message: "Las coordenadas recibidas no son válidas.",
          data: {},
        };
      }
      latEmpleado = coords.lat;
      lngEmpleado = coords.lng;
      precisionMetros = coords.accuracy;
      fuenteCoordenada = "gps";
    }

    if (sucursalEmp?.geocercaActiva) {
      const evalGeo = evaluarGeocerca({
        empleado:
          latEmpleado != null && lngEmpleado != null
            ? { lat: latEmpleado, lng: lngEmpleado }
            : null,
        sucursal:
          sucursalEmp.latitud != null && sucursalEmp.longitud != null
            ? { lat: sucursalEmp.latitud, lng: sucursalEmp.longitud }
            : null,
        radioMetros: sucursalEmp.radioMetros,
        geocercaActiva: true,
      });
      distanciaSucursalM = evalGeo.distanciaM || null;
      dentroGeocerca = evalGeo.dentroGeocerca;
      fueraDeGeocerca = !!evalGeo.fueraDeGeocerca;
    }

    const ipOrigen =
      (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = (await headers()).get("user-agent") ?? null;

    const tipo = await db.transaction(async (tx) => {
      const resumenLock = await tx
        .select()
        .from(resumenAsistenciaDiaria)
        .where(
          and(
            eq(resumenAsistenciaDiaria.empleadoId, emp.id),
            eq(resumenAsistenciaDiaria.fecha, today),
          ),
        )
        .for("update")
        .limit(1);

      const startOfDay = new Date(`${today}T00:00:00.000Z`);
      const endOfDay = new Date(`${today}T23:59:59.999Z`);

      const registrosHoy = await tx
        .select()
        .from(registroAsistencia)
        .where(
          and(
            eq(registroAsistencia.empleadoId, emp.id),
            gte(registroAsistencia.timestamp, startOfDay),
            lte(registroAsistencia.timestamp, endOfDay),
          ),
        )
        .orderBy(desc(registroAsistencia.timestamp));

      const ultimaMarcacion = registrosHoy[0];
      let tipoMarcacion: "entrada" | "salida";
      if (!ultimaMarcacion || ultimaMarcacion.tipo === "salida") {
        tipoMarcacion = "entrada";
      } else {
        tipoMarcacion = "salida";
      }

      const fuente = dispositivoId ? "quiosco" : "app";

      await tx.insert(registroAsistencia).values({
        empleadoId: emp.id,
        tipo: tipoMarcacion,
        timestamp: now,
        fuente,
        dispositivoId: dispositivoId || null,
        registradoPor: session.user.id,
        latEmpleado,
        lngEmpleado,
        precisionMetros,
        fuenteCoordenada,
        distanciaSucursalM,
        dentroGeocerca,
        fueraDeGeocerca,
        sucursalId: sucursalEmp?.id ?? null,
        ipOrigen,
        userAgent,
      });

      if (tipoMarcacion === "entrada") {
        await aplicarEntradaTx(tx, {
          empleadoId: emp.id,
          fecha: today,
          horaEntradaReal: now,
          horaEntradaAsignada: emp.horaEntrada,
        });
      } else {
        await aplicarSalidaTx(tx, {
          empleadoId: emp.id,
          fecha: today,
          horaSalidaReal: now,
          horaSalidaAsignada: emp.horaSalida,
          horasJornada: emp.horasJornada,
          resumenExistente: resumenLock[0] ?? null,
        });
      }

      if (fueraDeGeocerca) {
        const [registroCreado] = await tx
          .select({ id: registroAsistencia.id })
          .from(registroAsistencia)
          .where(
            and(
              eq(registroAsistencia.empleadoId, emp.id),
              eq(registroAsistencia.timestamp, now),
            ),
          )
          .orderBy(desc(registroAsistencia.createdAt))
          .limit(1);

        if (registroCreado && sucursalEmp) {
          await tx.insert(notificacionGeo).values({
            empleadoId: emp.id,
            registroId: registroCreado.id,
            sucursalId: sucursalEmp.id,
            distanciaM: distanciaSucursalM ?? 0,
          });
        }
      }

      return tipoMarcacion;
    });

    const nombreCompleto = `${emp.nombre} ${emp.apellidos}`;
    revalidatePath("/dashboard/mi-asistencia");
    revalidatePath("/dashboard/asistencia");

    return {
      success: true,
      message: `${nombreCompleto} — ${tipo === "entrada" ? "Entrada" : "Salida"} registrada a las ${now.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}`,
      data: {
        tipo,
        hora: now.toLocaleTimeString("es-CR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        empleadoNombre: nombreCompleto,
        fueraDeGeocerca,
        distanciaSucursalM,
        dentroGeocerca,
      },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al marcar asistencia:", error);
    return {
      success: false,
      message: "Error al registrar la marcación",
      data: {},
    };
  }
}

interface AplicarEntradaInput {
  empleadoId: string;
  fecha: string;
  horaEntradaReal: Date;
  horaEntradaAsignada: string | null;
}

async function aplicarEntradaTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: AplicarEntradaInput,
) {
  let esRetraso = false;
  let minutosRetraso = "0";

  if (input.horaEntradaAsignada) {
    const [h, m] = input.horaEntradaAsignada.split(":").map(Number);
    const entradaAsignada = new Date(input.horaEntradaReal);
    entradaAsignada.setHours(h, m, 0, 0);

    const diferenciaMin =
      (input.horaEntradaReal.getTime() - entradaAsignada.getTime()) / 60000;

    if (diferenciaMin > TOLERANCIA_RETRASO_MINUTOS) {
      esRetraso = true;
      minutosRetraso = diferenciaMin.toFixed(2);
    }
  }

  await tx
    .insert(resumenAsistenciaDiaria)
    .values({
      empleadoId: input.empleadoId,
      fecha: input.fecha,
      tieneEntrada: true,
      horaEntrada: input.horaEntradaReal,
      retraso: esRetraso,
      minutosRetraso,
    })
    .onConflictDoUpdate({
      target: [resumenAsistenciaDiaria.empleadoId, resumenAsistenciaDiaria.fecha],
      set: {
        tieneEntrada: true,
        horaEntrada: input.horaEntradaReal,
        retraso: esRetraso,
        minutosRetraso,
        updatedAt: new Date(),
      },
    });
}

interface AplicarSalidaInput {
  empleadoId: string;
  fecha: string;
  horaSalidaReal: Date;
  horaSalidaAsignada: string | null;
  horasJornada: number | null;
  resumenExistente: typeof resumenAsistenciaDiaria.$inferSelect | null;
}

async function aplicarSalidaTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: AplicarSalidaInput,
) {
  let horasOrdinarias = "0";
  let horasExtra = "0";

  if (input.resumenExistente?.horaEntrada) {
    const horaEnt = new Date(input.resumenExistente.horaEntrada);
    const diffHoras =
      (input.horaSalidaReal.getTime() - horaEnt.getTime()) / 3600000;

    const jornadaNum = input.horasJornada || 8;

    if (diffHoras > jornadaNum) {
      horasOrdinarias = jornadaNum.toFixed(2);
      horasExtra = (diffHoras - jornadaNum).toFixed(2);
    } else {
      horasOrdinarias = Math.max(0, diffHoras).toFixed(2);
    }
  }

  await tx
    .insert(resumenAsistenciaDiaria)
    .values({
      empleadoId: input.empleadoId,
      fecha: input.fecha,
      tieneSalida: true,
      horaSalida: input.horaSalidaReal,
      horasOrdinarias,
      horasExtra,
    })
    .onConflictDoUpdate({
      target: [resumenAsistenciaDiaria.empleadoId, resumenAsistenciaDiaria.fecha],
      set: {
        tieneSalida: true,
        horaSalida: input.horaSalidaReal,
        horasOrdinarias,
        horasExtra,
        updatedAt: new Date(),
      },
    });
}

export async function registrarManual(
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
        message: "No tenés permisos para registros manuales",
        data: {},
      };
    }

    const parsed = v.safeParse(RegistroManualSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [emp] = await db
      .select({ id: empleado.id, estado: empleado.estado })
      .from(empleado)
      .where(eq(empleado.id, data.empleadoId))
      .limit(1);

    if (!emp) {
      return {
        success: false,
        message: "Empleado no encontrado",
        data: {},
      };
    }

    const timestamp = data.hora
      ? new Date(`${data.fecha}T${data.hora}:00`)
      : new Date(`${data.fecha}T12:00:00`);

    const esEntradaOSalida = ["entrada", "salida"].includes(data.tipo);

    if (esEntradaOSalida) {
      await db.transaction(async (tx) => {
        await tx
          .insert(resumenAsistenciaDiaria)
          .values({
            empleadoId: data.empleadoId,
            fecha: data.fecha,
          })
          .onConflictDoNothing();

        await tx.insert(registroAsistencia).values({
          empleadoId: data.empleadoId,
          tipo: data.tipo,
          timestamp,
          fuente: "manual",
          registradoPor: session.user.id,
          nota: data.nota || null,
        });

        if (data.tipo === "entrada") {
          await aplicarEntradaTx(tx, {
            empleadoId: data.empleadoId,
            fecha: data.fecha,
            horaEntradaReal: timestamp,
            horaEntradaAsignada: null,
          });
        } else {
          const [previo] = await tx
            .select()
            .from(resumenAsistenciaDiaria)
            .where(
              and(
                eq(resumenAsistenciaDiaria.empleadoId, data.empleadoId),
                eq(resumenAsistenciaDiaria.fecha, data.fecha),
              ),
            )
            .limit(1);

          await aplicarSalidaTx(tx, {
            empleadoId: data.empleadoId,
            fecha: data.fecha,
            horaSalidaReal: timestamp,
            horaSalidaAsignada: null,
            horasJornada: 8,
            resumenExistente: previo ?? null,
          });
        }
      });
    } else {
      await db.insert(registroAsistencia).values({
        empleadoId: data.empleadoId,
        tipo: data.tipo,
        timestamp,
        fuente: "manual",
        registradoPor: session.user.id,
        nota: data.nota || null,
      });

      await db
        .insert(resumenAsistenciaDiaria)
        .values({
          empleadoId: data.empleadoId,
          fecha: data.fecha,
          ausente: true,
        })
        .onConflictDoUpdate({
          target: [
            resumenAsistenciaDiaria.empleadoId,
            resumenAsistenciaDiaria.fecha,
          ],
          set: {
            ausente: true,
            updatedAt: new Date(),
          },
        });
    }

    revalidatePath("/dashboard/asistencia");

    const tipoLabel: Record<string, string> = {
      entrada: "Entrada",
      salida: "Salida",
      ausencia: "Ausencia",
      incapacidad: "Incapacidad",
      permiso: "Permiso",
      vacacion: "Vacación",
    };

    return {
      success: true,
      message: `${tipoLabel[data.tipo] || data.tipo} registrada exitosamente`,
      data: {},
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al registrar manualmente:", error);
    return {
      success: false,
      message: "Error al registrar",
      data: {},
    };
  }
}

export async function getHistorialAsistencia(
  fechaInicio?: string,
  fechaFin?: string,
  sucursalId?: string,
  empleadoSearch?: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const conditions = [];
    const userRole = (session.user as { role?: string })?.role || "empleado";

    if (userRole === "empleado") {
      const emp = await getMiEmpleado(session.user.id);
      if (!emp) {
        return { success: true, message: "Sin perfil de empleado", data: { registros: [] } };
      }
      conditions.push(eq(resumenAsistenciaDiaria.empleadoId, emp.id));
    }

    if (fechaInicio) {
      conditions.push(gte(resumenAsistenciaDiaria.fecha, fechaInicio));
    }

    if (fechaFin) {
      conditions.push(lte(resumenAsistenciaDiaria.fecha, fechaFin));
    }

    if (sucursalId && userRole !== "empleado") {
      const ids = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(eq(empleado.sucursalId, sucursalId));
      if (ids.length === 0) {
        return { success: true, message: "Sin resultados", data: { registros: [] } };
      }
      conditions.push(
        inArray(
          resumenAsistenciaDiaria.empleadoId,
          ids.map((r) => r.id),
        ),
      );
    }

    if (empleadoSearch && userRole !== "empleado") {
      const term = `%${empleadoSearch.toLowerCase()}%`;
      const empIds = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(
          or(
            ilike(empleado.nombre, term),
            ilike(empleado.apellidos, term),
            ilike(empleado.cedula, `%${empleadoSearch}%`),
          ),
        );
      if (empIds.length === 0) {
        return { success: true, message: "Sin resultados", data: { registros: [] } };
      }
      conditions.push(
        inArray(
          resumenAsistenciaDiaria.empleadoId,
          empIds.map((r) => r.id),
        ),
      );
    }

    const results = await db
      .select({
        resumen: resumenAsistenciaDiaria,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(empleado, eq(resumenAsistenciaDiaria.empleadoId, empleado.id))
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .innerJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(resumenAsistenciaDiaria.fecha));

    return {
      success: true,
      message: "Historial obtenido exitosamente",
      data: { registros: results },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener historial:", error);
    return {
      success: false,
      message: "Error al obtener historial",
      data: {},
    };
  }
}

export async function getEmpleadosActivos(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";

    if (userRole === "empleado") {
      const emp = await getMiEmpleado(session.user.id);
      if (!emp) {
        return {
          success: true,
          message: "Empleados activos obtenidos",
          data: { empleados: [] },
        };
      }

      const [row] = await db
        .select({
          id: empleado.id,
          nombre: empleado.nombre,
          apellidos: empleado.apellidos,
          cedula: empleado.cedula,
          pin: empleado.pin,
          sucursalNombre: sucursal.nombre,
          puestoNombre: puesto.nombre,
          estado: empleado.estado,
        })
        .from(empleado)
        .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
        .innerJoin(puesto, eq(empleado.puestoId, puesto.id))
        .where(eq(empleado.id, emp.id))
        .limit(1);

      return {
        success: true,
        message: "Empleados activos obtenidos",
        data: { empleados: row ? [row] : [] },
      };
    }

    const results = await db
      .select({
        id: empleado.id,
        nombre: empleado.nombre,
        apellidos: empleado.apellidos,
        cedula: empleado.cedula,
        pin: empleado.pin,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
        estado: empleado.estado,
      })
      .from(empleado)
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .innerJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(eq(empleado.estado, "activo"))
      .orderBy(empleado.nombre);

    return {
      success: true,
      message: "Empleados activos obtenidos",
      data: { empleados: results },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener empleados activos:", error);
    return {
      success: false,
      message: "Error al obtener empleados",
      data: {},
    };
  }
}

export async function getResumenHoy(): Promise<ActionResponse> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const results = await db
      .select({
        resumen: resumenAsistenciaDiaria,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        sucursalNombre: sucursal.nombre,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(empleado, eq(resumenAsistenciaDiaria.empleadoId, empleado.id))
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(eq(resumenAsistenciaDiaria.fecha, today))
      .orderBy(desc(resumenAsistenciaDiaria.horaEntrada));

    return {
      success: true,
      message: "Resumen de hoy obtenido",
      data: { resumen: results },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener resumen de hoy:", error);
    return {
      success: false,
      message: "Error al obtener resumen",
      data: {},
    };
  }
}

export async function corteAutomatico(
  fecha?: string,
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
        message: "No tenés permisos para realizar corte automático",
        data: {},
      };
    }

    const targetDate = fecha || new Date().toISOString().split("T")[0];

    const empleadosActivos = await db
      .select({ id: empleado.id, horaSalida: empleado.horaSalida, horasJornada: empleado.horasJornada })
      .from(empleado)
      .where(eq(empleado.estado, "activo"));

    let cortes = 0;

    for (const emp of empleadosActivos) {
      const [resumen] = await db
        .select()
        .from(resumenAsistenciaDiaria)
        .where(
          and(
            eq(resumenAsistenciaDiaria.empleadoId, emp.id),
            eq(resumenAsistenciaDiaria.fecha, targetDate),
          ),
        )
        .limit(1);

      if (resumen?.tieneEntrada && !resumen.tieneSalida) {
        const salidaAuto = new Date(`${targetDate}T${emp.horaSalida || "17:00:00"}`);

        await db.transaction(async (tx) => {
          await tx.insert(registroAsistencia).values({
            empleadoId: emp.id,
            tipo: "salida",
            timestamp: salidaAuto,
            fuente: "corte-automatico",
            registradoPor: session.user.id,
            nota: "Salida registrada automáticamente por corte",
          });

          await aplicarSalidaTx(tx, {
            empleadoId: emp.id,
            fecha: targetDate,
            horaSalidaReal: salidaAuto,
            horaSalidaAsignada: emp.horaSalida,
            horasJornada: emp.horasJornada,
            resumenExistente: resumen,
          });
        });

        cortes++;
      } else if (!resumen) {
        await db
          .insert(resumenAsistenciaDiaria)
          .values({
            empleadoId: emp.id,
            fecha: targetDate,
            ausente: true,
          })
          .onConflictDoNothing();

        await db.insert(registroAsistencia).values({
          empleadoId: emp.id,
          tipo: "ausencia",
          timestamp: new Date(`${targetDate}T23:59:00`),
          fuente: "corte-automatico",
          registradoPor: session.user.id,
          nota: "Ausencia registrada automáticamente por corte",
        });

        cortes++;
      }
    }

    revalidatePath("/dashboard/asistencia");

    return {
      success: true,
      message: `Corte automático completado: ${cortes} registros procesados`,
      data: { cortes },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error en corte automático:", error);
    return {
      success: false,
      message: "Error al realizar corte automático",
      data: {},
    };
  }
}

export async function getDispositivos(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const results = await db
      .select({
        dispositivo: dispositivoQuiosco,
        sucursalNombre: sucursal.nombre,
      })
      .from(dispositivoQuiosco)
      .innerJoin(sucursal, eq(dispositivoQuiosco.sucursalId, sucursal.id))
      .orderBy(dispositivoQuiosco.createdAt);

    return {
      success: true,
      message: "Dispositivos obtenidos",
      data: { dispositivos: results },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener dispositivos:", error);
    return { success: false, message: "Error al obtener dispositivos", data: {} };
  }
}

export async function crearDispositivo(
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
        message: "No tenés permisos para crear dispositivos",
        data: {},
      };
    }

    const parsed = v.safeParse(CrearDispositivoSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [newDispositivo] = await db
      .insert(dispositivoQuiosco)
      .values({
        nombre: data.nombre,
        sucursalId: data.sucursalId,
        tokenHash,
        activadoPor: session.user.id,
      })
      .returning();

    revalidatePath("/dashboard/asistencia");

    return {
      success: true,
      message: "Dispositivo creado exitosamente",
      data: { dispositivo: newDispositivo, token },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al crear dispositivo:", error);
    return {
      success: false,
      message: "Error al crear dispositivo",
      data: {},
    };
  }
}

export async function toggleDispositivo(
  id: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const [disp] = await db
      .select({ activo: dispositivoQuiosco.activo })
      .from(dispositivoQuiosco)
      .where(eq(dispositivoQuiosco.id, id))
      .limit(1);

    if (!disp) {
      return { success: false, message: "Dispositivo no encontrado", data: {} };
    }

    await db
      .update(dispositivoQuiosco)
      .set({ activo: !disp.activo, updatedAt: new Date() })
      .where(eq(dispositivoQuiosco.id, id));

    revalidatePath("/dashboard/asistencia");

    return {
      success: true,
      message: `Dispositivo ${!disp.activo ? "activado" : "desactivado"}`,
      data: {},
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al togglear dispositivo:", error);
    return { success: false, message: "Error al cambiar estado", data: {} };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Solicitudes personales (día libre / permiso / incapacidad)
// ────────────────────────────────────────────────────────────────────────────

export async function solicitarDiaPersonal(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const parsed = v.safeParse(SolicitudPersonalSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }
    const data = parsed.output;

    if (data.fechaFin < data.fechaInicio) {
      return {
        success: false,
        message: "La fecha de fin no puede ser anterior a la fecha de inicio",
        data: {},
      };
    }

    const emp = await getMiEmpleado(session.user.id);
    if (!emp) {
      return {
        success: false,
        message: "No se encontró un perfil de empleado",
        data: {},
      };
    }

    const solapadas = await db
      .select({ id: solicitudPersonal.id })
      .from(solicitudPersonal)
      .where(
        and(
          eq(solicitudPersonal.empleadoId, emp.id),
          inArray(solicitudPersonal.estado, ["pendiente", "aprobada"]),
          lte(solicitudPersonal.fechaInicio, data.fechaFin),
          gte(solicitudPersonal.fechaFin, data.fechaInicio),
        ),
      )
      .limit(1);

    if (solapadas.length > 0) {
      return {
        success: false,
        message: "Ya tenés una solicitud pendiente o aprobada que se solapa con esas fechas.",
        data: {},
      };
    }

    const diasHabiles = calcularDiasHabilesSimple(
      data.fechaInicio,
      data.fechaFin,
    );

    await db.insert(solicitudPersonal).values({
      empleadoId: emp.id,
      tipo: data.tipo,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      diasHabiles,
      motivo: data.motivo || null,
      adjuntoUrl: data.adjuntoUrl || null,
    });

    revalidatePath("/dashboard/mi-asistencia");
    revalidatePath("/dashboard/vacations");

    return {
      success: true,
      message: `Solicitud enviada exitosamente (${diasHabiles} días hábiles).`,
      data: {},
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al solicitar día personal:", error);
    return {
      success: false,
      message: "Error al enviar la solicitud",
      data: {},
    };
  }
}

export async function getMisSolicitudes(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const emp = await getMiEmpleado(session.user.id);
    if (!emp) {
      return { success: true, message: "Sin solicitudes", data: { solicitudes: [] } };
    }

    const results = await db
      .select()
      .from(solicitudPersonal)
      .where(eq(solicitudPersonal.empleadoId, emp.id))
      .orderBy(desc(solicitudPersonal.createdAt));

    return {
      success: true,
      message: "Solicitudes obtenidas",
      data: { solicitudes: results },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener mis solicitudes:", error);
    return {
      success: false,
      message: "Error al obtener solicitudes",
      data: {},
    };
  }
}

export async function getSolicitudesPersonal(
  estado?: "pendiente" | "aprobada" | "rechazada" | "cancelada",
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
        message: "No tenés permisos para ver solicitudes",
        data: {},
      };
    }

    const conditions = [];
    if (estado) {
      conditions.push(eq(solicitudPersonal.estado, estado));
    }

    const results = await db
      .select({
        solicitud: solicitudPersonal,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalNombre: sucursal.nombre,
      })
      .from(solicitudPersonal)
      .innerJoin(empleado, eq(solicitudPersonal.empleadoId, empleado.id))
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(solicitudPersonal.createdAt));

    return {
      success: true,
      message: "Solicitudes obtenidas",
      data: { solicitudes: results },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener solicitudes:", error);
    return {
      success: false,
      message: "Error al obtener solicitudes",
      data: {},
    };
  }
}

export async function aprobarRechazarSolicitudPersonal(
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

    const parsed = v.safeParse(AprobarRechazarSolicitudPersonalSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }
    const data = parsed.output;

    const [sol] = await db
      .select()
      .from(solicitudPersonal)
      .where(eq(solicitudPersonal.id, data.solicitudId))
      .limit(1);
    if (!sol) {
      return { success: false, message: "Solicitud no encontrada", data: {} };
    }
    if (sol.estado !== "pendiente") {
      return {
        success: false,
        message: "La solicitud ya fue procesada",
        data: {},
      };
    }

    const nuevoEstado = data.accion === "aprobar" ? "aprobada" : "rechazada";

    await db
      .update(solicitudPersonal)
      .set({
        estado: nuevoEstado,
        aprobadaPor: session.user.id,
        aprobadaEn: new Date(),
        notaResolucion: data.notaResolucion || null,
        updatedAt: new Date(),
      })
      .where(eq(solicitudPersonal.id, data.solicitudId));

    if (data.accion === "aprobar") {
      const fechaInicio = new Date(`${sol.fechaInicio}T00:00:00`);
      const fechaFin = new Date(`${sol.fechaFin}T00:00:00`);
      const cursor = new Date(fechaInicio);
      while (cursor <= fechaFin) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) {
          const fechaStr = cursor.toISOString().split("T")[0];
          await db.insert(registroAsistencia).values({
            empleadoId: sol.empleadoId,
            tipo: "permiso",
            timestamp: new Date(`${fechaStr}T08:00:00`),
            fuente: "sistema",
            registradoPor: session.user.id,
            nota: `${sol.tipo} aprobado: ${sol.fechaInicio} a ${sol.fechaFin}`,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    revalidatePath("/dashboard/mi-asistencia");
    revalidatePath("/dashboard/vacations");

    return {
      success: true,
      message:
        data.accion === "aprobar"
          ? "Solicitud aprobada"
          : "Solicitud rechazada",
      data: {},
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al procesar solicitud:", error);
    return {
      success: false,
      message: "Error al procesar la solicitud",
      data: {},
    };
  }
}

function calcularDiasHabilesSimple(
  fechaInicio: string,
  fechaFin: string,
): number {
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  if (fin < inicio) return 0;
  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) dias++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

// ────────────────────────────────────────────────────────────────────────────
// Notificaciones geo (marcaciones fuera de geocerca)
// ────────────────────────────────────────────────────────────────────────────

export async function getNotificacionesGeo(
  fechaInicio?: string,
  fechaFin?: string,
  sucursalId?: string,
  soloPendientes = true,
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
        message: "No tenés permisos para ver notificaciones geo",
        data: {},
      };
    }

    const conditions = [];
    if (soloPendientes) {
      conditions.push(eq(notificacionGeo.resuelta, false));
    }
    if (fechaInicio) {
      conditions.push(
        gte(notificacionGeo.createdAt, new Date(`${fechaInicio}T00:00:00`)),
      );
    }
    if (fechaFin) {
      conditions.push(
        lte(notificacionGeo.createdAt, new Date(`${fechaFin}T23:59:59`)),
      );
    }
    if (sucursalId) {
      conditions.push(eq(notificacionGeo.sucursalId, sucursalId));
    }

    const results = await db
      .select({
        notificacion: notificacionGeo,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalNombre: sucursal.nombre,
        registroTipo: registroAsistencia.tipo,
        registroTimestamp: registroAsistencia.timestamp,
        registroLat: registroAsistencia.latEmpleado,
        registroLng: registroAsistencia.lngEmpleado,
        registroPrecision: registroAsistencia.precisionMetros,
        registroFuente: registroAsistencia.fuente,
        resueltoPorNombre: sql<string | null>`resolver.name`,
      })
      .from(notificacionGeo)
      .innerJoin(empleado, eq(notificacionGeo.empleadoId, empleado.id))
      .innerJoin(sucursal, eq(notificacionGeo.sucursalId, sucursal.id))
      .innerJoin(
        registroAsistencia,
        eq(notificacionGeo.registroId, registroAsistencia.id),
      )
      .leftJoin(
        sql`"user" resolver`,
        sql`resolver.id = ${notificacionGeo.resueltaPor}`,
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(notificacionGeo.createdAt));

    return {
      success: true,
      message: "Notificaciones geo obtenidas",
      data: { notificaciones: results },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener notificaciones geo:", error);
    return {
      success: false,
      message: "Error al obtener notificaciones",
      data: {},
    };
  }
}

export async function resolverNotificacionGeo(
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
        message: "No tenés permisos para resolver notificaciones",
        data: {},
      };
    }

    const parsed = v.safeParse(ResolverNotificacionGeoSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }
    const data = parsed.output;

    const [notif] = await db
      .select()
      .from(notificacionGeo)
      .where(eq(notificacionGeo.id, data.notificacionId))
      .limit(1);
    if (!notif) {
      return { success: false, message: "Notificación no encontrada", data: {} };
    }
    if (notif.resuelta) {
      return {
        success: false,
        message: "La notificación ya fue resuelta",
        data: {},
      };
    }

    await db
      .update(notificacionGeo)
      .set({
        resuelta: true,
        resueltaPor: session.user.id,
        resueltaEn: new Date(),
        accion: data.accion,
        nota: data.nota || null,
      })
      .where(eq(notificacionGeo.id, data.notificacionId));

    revalidatePath("/dashboard/asistencia");
    revalidatePath("/dashboard/asistencia/metricas");

    return {
      success: true,
      message: "Notificación resuelta",
      data: {},
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al resolver notificación:", error);
    return {
      success: false,
      message: "Error al resolver la notificación",
      data: {},
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Métricas de asistencia (RRHH) + candidatos a deducción
// ────────────────────────────────────────────────────────────────────────────

export interface CandidatoDeduccion {
  empleadoId: string;
  empleadoNombre: string;
  empleadoCedula: string;
  fecha: string;
  tipoCandidato: "retraso" | "ausencia" | "horas-faltantes";
  descripcion: string;
  minutosRetraso?: number;
  horasFaltantes?: number;
  planillaSugeridaId: string | null;
}

export async function getMetricasAsistencia(input: {
  fechaInicio: string;
  fechaFin: string;
  sucursalId?: string;
  empleadoSearch?: string;
  empleadoId?: string;
}): Promise<ActionResponse> {
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
        message: "No tenés permisos para ver métricas",
        data: {},
      };
    }

    const conditions = [
      gte(resumenAsistenciaDiaria.fecha, input.fechaInicio),
      lte(resumenAsistenciaDiaria.fecha, input.fechaFin),
    ];

    if (input.sucursalId) {
      conditions.push(eq(empleado.sucursalId, input.sucursalId));
    }
    if (input.empleadoId) {
      conditions.push(eq(resumenAsistenciaDiaria.empleadoId, input.empleadoId));
    }
    if (input.empleadoSearch) {
      const term = `%${input.empleadoSearch.toLowerCase()}%`;
      const empIds = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(
          or(
            ilike(empleado.nombre, term),
            ilike(empleado.apellidos, term),
            ilike(empleado.cedula, `%${input.empleadoSearch}%`),
          ),
        );
      if (empIds.length === 0) {
        return {
          success: true,
          message: "Sin resultados",
          data: {
            registros: [],
            resumen: {
              totalRegistros: 0,
              totalAusencias: 0,
              totalRetrasos: 0,
              totalHorasOrdinarias: "0",
              totalHorasExtra: "0",
              promedioRetrasoMinutos: "0",
            },
            candidatos: [],
          },
        };
      }
      conditions.push(
        inArray(
          resumenAsistenciaDiaria.empleadoId,
          empIds.map((r) => r.id),
        ),
      );
    }

    const registros = await db
      .select({
        resumen: resumenAsistenciaDiaria,
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalId: sucursal.id,
        sucursalNombre: sucursal.nombre,
        horasJornada: empleado.horasJornada,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(empleado, eq(resumenAsistenciaDiaria.empleadoId, empleado.id))
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(and(...conditions))
      .orderBy(desc(resumenAsistenciaDiaria.fecha));

    const [resumen] = await db
      .select({
        totalRegistros: sql<number>`count(*)`,
        totalAusencias: sql<number>`sum(case when ${resumenAsistenciaDiaria.ausente} = true then 1 else 0 end)`,
        totalRetrasos: sql<number>`sum(case when ${resumenAsistenciaDiaria.retraso} = true then 1 else 0 end)`,
        totalHorasOrdinarias: sql<string>`coalesce(sum(${resumenAsistenciaDiaria.horasOrdinarias}), 0)`,
        totalHorasExtra: sql<string>`coalesce(sum(${resumenAsistenciaDiaria.horasExtra}), 0)`,
        promedioRetrasoMinutos: sql<string>`coalesce(avg(case when ${resumenAsistenciaDiaria.retraso} = true then ${resumenAsistenciaDiaria.minutosRetraso} else null end), 0)`,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(empleado, eq(resumenAsistenciaDiaria.empleadoId, empleado.id))
      .where(and(...conditions));

    const candidatos: CandidatoDeduccion[] = [];
    for (const r of registros) {
      const planillaId = await getPlanillaBorradorPorEmpleadoYPeriodo(
        r.empleadoId,
        r.resumen.fecha,
        r.resumen.fecha,
      );

      if (r.resumen.retraso) {
        const mins = parseFloat(r.resumen.minutosRetraso || "0");
        candidatos.push({
          empleadoId: r.empleadoId,
          empleadoNombre: `${r.empleadoNombre} ${r.empleadoApellidos}`,
          empleadoCedula: r.empleadoCedula,
          fecha: r.resumen.fecha,
          tipoCandidato: "retraso",
          descripcion: `Retraso de ${mins.toFixed(0)} min el ${r.resumen.fecha}`,
          minutosRetraso: mins,
          planillaSugeridaId: planillaId,
        });
      }
      if (r.resumen.ausente) {
        candidatos.push({
          empleadoId: r.empleadoId,
          empleadoNombre: `${r.empleadoNombre} ${r.empleadoApellidos}`,
          empleadoCedula: r.empleadoCedula,
          fecha: r.resumen.fecha,
          tipoCandidato: "ausencia",
          descripcion: `Ausencia el ${r.resumen.fecha}`,
          planillaSugeridaId: planillaId,
        });
      }
      const horasEsp = r.horasJornada || 8;
      const horasOrd = parseFloat(r.resumen.horasOrdinarias || "0");
      if (horasOrd < horasEsp && (r.resumen.tieneEntrada || r.resumen.tieneSalida)) {
        const horasFaltantes = +(horasEsp - horasOrd).toFixed(2);
        candidatos.push({
          empleadoId: r.empleadoId,
          empleadoNombre: `${r.empleadoNombre} ${r.empleadoApellidos}`,
          empleadoCedula: r.empleadoCedula,
          fecha: r.resumen.fecha,
          tipoCandidato: "horas-faltantes",
          descripcion: `${horasFaltantes} h faltantes el ${r.resumen.fecha}`,
          horasFaltantes,
          planillaSugeridaId: planillaId,
        });
      }
    }

    return {
      success: true,
      message: "Métricas generadas",
      data: {
        registros,
        resumen: resumen ?? {
          totalRegistros: 0,
          totalAusencias: 0,
          totalRetrasos: 0,
          totalHorasOrdinarias: "0",
          totalHorasExtra: "0",
          promedioRetrasoMinutos: "0",
        },
        candidatos,
        filtros: input,
      },
    };
  } catch (error) {
    logger.error("ASISTENCIA", "Error al obtener métricas:", error);
    return {
      success: false,
      message: "Error al obtener métricas",
      data: {},
    };
  }
}

export async function getPlanillaBorradorPorEmpleadoYPeriodo(
  empleadoId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<string | null> {
  const results = await db
    .select({ id: planilla.id })
    .from(planilla)
    .innerJoin(detallePlanilla, eq(detallePlanilla.planillaId, planilla.id))
    .where(
      and(
        eq(planilla.estado, "borrador"),
        eq(detallePlanilla.empleadoId, empleadoId),
        lte(planilla.fechaInicio, fechaFin),
        gte(planilla.fechaFin, fechaInicio),
      ),
    )
    .orderBy(desc(planilla.createdAt))
    .limit(1);

  return results[0]?.id ?? null;
}
