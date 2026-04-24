"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { empleado } from "@/db/schema/empleado.schema";
import { registroAsistencia } from "@/db/schema/registro-asistencia.schema";
import { resumenAsistenciaDiaria } from "@/db/schema/resumen-asistencia-diaria.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { eq, and, desc, gte, lte, sql, like } from "drizzle-orm";
import * as v from "valibot";
import {
  MarcarAsistenciaSchema,
  RegistroManualSchema,
  CrearDispositivoSchema,
} from "@/lib/validations/asistencia";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { dispositivoQuiosco } from "@/db/schema/dispositivo-quiosco.schema";
import crypto from "crypto";

const TOLERANCIA_RETRASO_MINUTOS = 15;

export async function marcarAsistencia(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const parsed = v.safeParse(MarcarAsistenciaSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "PIN inválido",
        data: { errors: parsed.issues },
      };
    }

    const { pin, dispositivoId } = parsed.output;

    const [emp] = await db
      .select({
        id: empleado.id,
        nombre: empleado.nombre,
        apellidos: empleado.apellidos,
        estado: empleado.estado,
        horaEntrada: empleado.horaEntrada,
        horaSalida: empleado.horaSalida,
        horasJornada: empleado.horasJornada,
      })
      .from(empleado)
      .where(and(eq(empleado.pin, pin), eq(empleado.estado, "activo")))
      .limit(1);

    if (!emp) {
      return {
        success: false,
        message: "PIN no encontrado o empleado inactivo",
        data: {},
      };
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const startOfDay = new Date(today + "T00:00:00.000Z");
    const endOfDay = new Date(today + "T23:59:59.999Z");

    const registrosHoy = await db
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
    let tipo: string;

    if (!ultimaMarcacion || ultimaMarcacion.tipo === "salida") {
      tipo = "entrada";
    } else if (ultimaMarcacion.tipo === "entrada") {
      tipo = "salida";
    } else {
      tipo = "entrada";
    }

    const [newRegistro] = await db
      .insert(registroAsistencia)
      .values({
        empleadoId: emp.id,
        tipo,
        timestamp: now,
        fuente: dispositivoId ? "quiosco" : "pin",
        dispositivoId: dispositivoId || null,
        registradoPor: null,
      })
      .returning();

    if (tipo === "entrada") {
      await procesarEntrada(emp.id, today, now, emp.horaEntrada);
    } else if (tipo === "salida") {
      await procesarSalida(
        emp.id,
        today,
        now,
        emp.horaSalida,
        emp.horasJornada,
      );
    }

    const nombreCompleto = `${emp.nombre} ${emp.apellidos}`;

    return {
      success: true,
      message: `${nombreCompleto} — ${tipo === "entrada" ? "Entrada" : "Salida"} registrada a las ${now.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}`,
      data: {
        registro: newRegistro,
        tipo,
        empleadoNombre: nombreCompleto,
        hora: now.toLocaleTimeString("es-CR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
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

async function procesarEntrada(
  empleadoId: string,
  fecha: string,
  horaEntradaReal: Date,
  horaEntradaAsignada: string | null,
) {
  let esRetraso = false;
  let minutosRetraso = "0";

  if (horaEntradaAsignada) {
    const [h, m] = horaEntradaAsignada.split(":").map(Number);
    const entradaAsignada = new Date(horaEntradaReal);
    entradaAsignada.setHours(h, m, 0, 0);

    const diferenciaMs = horaEntradaReal.getTime() - entradaAsignada.getTime();
    const diferenciaMin = diferenciaMs / (1000 * 60);

    if (diferenciaMin > TOLERANCIA_RETRASO_MINUTOS) {
      esRetraso = true;
      minutosRetraso = diferenciaMin.toFixed(2);
    }
  }

  await db
    .insert(resumenAsistenciaDiaria)
    .values({
      empleadoId,
      fecha,
      tieneEntrada: true,
      horaEntrada: horaEntradaReal,
      retraso: esRetraso,
      minutosRetraso,
    })
    .onConflictDoUpdate({
      target: [resumenAsistenciaDiaria.empleadoId, resumenAsistenciaDiaria.fecha],
      set: {
        tieneEntrada: true,
        horaEntrada: horaEntradaReal,
        retraso: esRetraso,
        minutosRetraso,
        updatedAt: new Date(),
      },
    });
}

async function procesarSalida(
  empleadoId: string,
  fecha: string,
  horaSalidaReal: Date,
  horaSalidaAsignada: string | null,
  horasJornada: number | null,
) {
  const [resumen] = await db
    .select()
    .from(resumenAsistenciaDiaria)
    .where(
      and(
        eq(resumenAsistenciaDiaria.empleadoId, empleadoId),
        eq(resumenAsistenciaDiaria.fecha, fecha),
      ),
    )
    .limit(1);

  let horasOrdinarias = "0";
  let horasExtra = "0";

  if (resumen?.horaEntrada) {
    const horaEnt = new Date(resumen.horaEntrada);
    const diffMs = horaSalidaReal.getTime() - horaEnt.getTime();
    const diffHoras = diffMs / (1000 * 60 * 60);

    const jornadaNum = horasJornada || 8;

    if (diffHoras > jornadaNum) {
      horasOrdinarias = jornadaNum.toFixed(2);
      horasExtra = (diffHoras - jornadaNum).toFixed(2);
    } else {
      horasOrdinarias = Math.max(0, diffHoras).toFixed(2);
    }
  }

  await db
    .insert(resumenAsistenciaDiaria)
    .values({
      empleadoId,
      fecha,
      tieneSalida: true,
      horaSalida: horaSalidaReal,
      horasOrdinarias,
      horasExtra,
    })
    .onConflictDoUpdate({
      target: [resumenAsistenciaDiaria.empleadoId, resumenAsistenciaDiaria.fecha],
      set: {
        tieneSalida: true,
        horaSalida: horaSalidaReal,
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
      await db.insert(registroAsistencia).values({
        empleadoId: data.empleadoId,
        tipo: data.tipo,
        timestamp,
        fuente: "manual",
        registradoPor: session.user.id,
        nota: data.nota || null,
      });

      if (data.tipo === "entrada") {
        await procesarEntrada(data.empleadoId, data.fecha, timestamp, null);
      } else {
        await procesarSalida(data.empleadoId, data.fecha, timestamp, null, 8);
      }
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

    if (fechaInicio) {
      conditions.push(
        gte(resumenAsistenciaDiaria.fecha, fechaInicio),
      );
    }

    if (fechaFin) {
      conditions.push(lte(resumenAsistenciaDiaria.fecha, fechaFin));
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

    let filtered = results;

    if (sucursalId) {
      filtered = filtered.filter(
        (r) => r.sucursalNombre !== undefined,
      );
      const sucursalResults = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(eq(empleado.sucursalId, sucursalId));
      const sucursalEmpleadoIds = new Set(sucursalResults.map((e) => e.id));
      filtered = filtered.filter((r) =>
        sucursalEmpleadoIds.has(r.resumen.empleadoId),
      );
    }

    if (empleadoSearch) {
      const term = empleadoSearch.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.empleadoNombre.toLowerCase().includes(term) ||
          r.empleadoApellidos.toLowerCase().includes(term) ||
          r.empleadoCedula.includes(term),
      );
    }

    return {
      success: true,
      message: "Historial obtenido exitosamente",
      data: { registros: filtered },
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

    const startOfDay = new Date(targetDate + "T00:00:00.000Z");
    const endOfDay = new Date(targetDate + "T23:59:59.999Z");

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
        const salidaAuto = new Date(targetDate + "T" + (emp.horaSalida || "17:00:00"));

        await db.insert(registroAsistencia).values({
          empleadoId: emp.id,
          tipo: "salida",
          timestamp: salidaAuto,
          fuente: "corte-automatico",
          registradoPor: session.user.id,
          nota: "Salida registrada automáticamente por corte",
        });

        await procesarSalida(emp.id, targetDate, salidaAuto, emp.horaSalida, emp.horasJornada);
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
          timestamp: new Date(targetDate + "T23:59:00"),
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
