"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { eq, sql } from "drizzle-orm";
import {
  OtorgarVacacionSchema,
  AjusteSaldoSchema,
  type OtorgarVacacionData,
  type AjusteSaldoData,
} from "@/lib/validations/saldo-vacacion";
import {
  calcularSaldoEmpleado,
  listarEmpleadosConSaldo,
  listarMovimientosEmpleado,
  obtenerResumenSaldoEmpleado,
  MAX_DIAS_POR_OTORGAMIENTO,
  type EmpleadoConSaldo,
  type ResumenSaldo,
} from "@/lib/saldo-vacaciones";
import { movimientoSaldoVacacion } from "@/db/schema/movimiento-saldo-vacacion.schema";
import { saldoVacaciones } from "@/db/schema/saldo-vacaciones.schema";
import { empleado } from "@/db/schema/empleado.schema";
import { emailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/auditoria";
import { calcularDiasHabiles } from "@/lib/vacaciones";
import { generarBoletaVacacionPdf } from "@/lib/vacaciones-pdf";

type Role = "admin" | "rrhh" | "empleado";

function getRole(session: { user: { id: string; role?: string | null } } | null): Role {
  if (!session?.user) return "empleado";
  return ((session.user.role as Role) ?? "empleado") as Role;
}

function unauthorized(): ActionResponse {
  return { success: false, message: "No autorizado", data: {} };
}

function forbidden(message = "No tenés permisos para realizar esta acción"): ActionResponse {
  return { success: false, message, data: {} };
}

async function getSessionAndRole() {
  const session = await auth.api.getSession({ headers: await headers() });
  return { session, role: getRole(session) };
}

/**
 * Refresca la fila de saldo_vacaciones del empleado con los valores calculados
 * a partir del histórico. Se usa para mantener la coherencia de la caché.
 */
async function refrescarCacheSaldo(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  empleadoId: string,
  actualizadoPor: string,
): Promise<void> {
  const res = await tx
    .select({
      empleadoId: sql<string>`e.id`,
      fechaIngreso: sql<string>`e.fecha_ingreso::text`,
      totalOtorgamientos: sql<number>`COALESCE((SELECT SUM(m.dias) FROM movimiento_saldo_vacacion m WHERE m.empleado_id = e.id AND m.tipo = 'otorgamiento'), 0)`,
      totalAjustesPositivos: sql<number>`COALESCE((SELECT SUM(m.dias) FROM movimiento_saldo_vacacion m WHERE m.empleado_id = e.id AND m.tipo IN ('ajuste_positivo', 'devengo')), 0)`,
      totalAjustesNegativos: sql<number>`COALESCE((SELECT SUM(m.dias) FROM movimiento_saldo_vacacion m WHERE m.empleado_id = e.id AND m.tipo = 'ajuste_negativo'), 0)`,
    })
    .from(sql`empleado e`)
    .where(sql`e.id = ${empleadoId}`)
    .limit(1);

  const row = res[0];
  if (!row) return;

  const meses =
    (new Date().getFullYear() - new Date(row.fechaIngreso).getFullYear()) * 12 +
    (new Date().getMonth() - new Date(row.fechaIngreso).getMonth()) -
    (new Date().getDate() < new Date(row.fechaIngreso).getDate() ? 1 : 0);
  const devengados = Math.max(0, meses);

  const otorgados = Number(row.totalOtorgamientos) || 0;
  const ajustesPos = Number(row.totalAjustesPositivos) || 0;
  const ajustesNeg = Number(row.totalAjustesNegativos) || 0;

  const diasDisponibles = devengados + ajustesPos + otorgados + ajustesNeg;

  await tx
    .insert(saldoVacaciones)
    .values({
      empleadoId,
      periodoInicio: row.fechaIngreso,
      periodoFin: "2099-12-31",
      diasOtorgados: Math.abs(otorgados),
      diasDisponibles,
      diasUsados: Math.abs(otorgados),
      ultimaActualizacion: new Date(),
      actualizadoPor,
    })
    .onConflictDoUpdate({
      target: [saldoVacaciones.empleadoId, saldoVacaciones.periodoInicio],
      set: {
        diasOtorgados: Math.abs(otorgados),
        diasDisponibles,
        diasUsados: Math.abs(otorgados),
        ultimaActualizacion: new Date(),
        actualizadoPor,
      },
    });
}

export async function getResumenSaldo(input: {
  empleadoId?: string;
}): Promise<ActionResponse> {
  try {
    const { session, role } = await getSessionAndRole();
    if (!session?.user) return unauthorized();

    let targetId = input.empleadoId;

    if (role === "empleado") {
      const [emp] = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(eq(empleado.userId, session.user.id))
        .limit(1);
      if (!emp) {
        return { success: false, message: "No se encontró perfil de empleado", data: {} };
      }
      targetId = emp.id;
    }

    if (!targetId) {
      return { success: false, message: "Falta empleadoId", data: {} };
    }

    const { resumen, empleado: empData } = await obtenerResumenSaldoEmpleado(targetId);

    return {
      success: true,
      message: "Resumen de saldo obtenido",
      data: { resumen, empleado: empData },
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al obtener resumen:", error);
    return { success: false, message: "Error al obtener resumen", data: {} };
  }
}

export async function getEmpleadosConSaldo(filtros?: {
  busqueda?: string;
  sucursalId?: string;
  conSaldoBajo?: boolean;
}): Promise<ActionResponse> {
  try {
    const { session, role } = await getSessionAndRole();
    if (!session?.user) return unauthorized();
    if (role === "empleado") {
      return forbidden("Solo RRHH y Admin pueden ver la lista de empleados");
    }

    const lista: EmpleadoConSaldo[] = await listarEmpleadosConSaldo(filtros);

    return {
      success: true,
      message: "Lista de saldos obtenida",
      data: { empleados: lista },
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al listar empleados con saldo:", error);
    return { success: false, message: "Error al listar", data: {} };
  }
}

export async function getHistorialMovimientos(input: {
  empleadoId: string;
}): Promise<ActionResponse> {
  try {
    const { session, role } = await getSessionAndRole();
    if (!session?.user) return unauthorized();

    if (role === "empleado") {
      const [emp] = await db
        .select({ id: empleado.id })
        .from(empleado)
        .where(eq(empleado.userId, session.user.id))
        .limit(1);
      if (!emp || emp.id !== input.empleadoId) {
        return forbidden("Solo podés ver tu propio historial");
      }
    }

    const movimientos = await listarMovimientosEmpleado(input.empleadoId);
    return {
      success: true,
      message: "Historial obtenido",
      data: { movimientos },
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al obtener historial:", error);
    return { success: false, message: "Error al obtener historial", data: {} };
  }
}

export interface OtorgarVacacionResult {
  movimientoId: string;
  diasDisponiblesRestantes: number;
  emailEnviado: boolean;
}

export async function otorgarVacacion(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { session, role } = await getSessionAndRole();
    if (!session?.user) return unauthorized();
    if (role !== "admin" && role !== "rrhh") {
      return forbidden("Solo RRHH y Admin pueden otorgar vacaciones");
    }

    const parsed = (await import("valibot")).safeParse(OtorgarVacacionSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }
    const data: OtorgarVacacionData = parsed.output;

    if (data.fechaFin < data.fechaInicio) {
      return {
        success: false,
        message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
        data: {},
      };
    }

    const diasHabiles = await calcularDiasHabiles(data.fechaInicio, data.fechaFin);

    if (diasHabiles === 0) {
      return {
        success: false,
        message:
          "El rango seleccionado no contiene días hábiles (excluyendo fines de semana y feriados).",
        data: {},
      };
    }

    if (diasHabiles > MAX_DIAS_POR_OTORGAMIENTO) {
      return {
        success: false,
        message: `El rango tiene ${diasHabiles} días hábiles, pero el tope por otorgamiento es ${MAX_DIAS_POR_OTORGAMIENTO}.`,
        data: {},
      };
    }

    const resumenPre = await calcularSaldoEmpleado(data.empleadoId);
    if (diasHabiles > resumenPre.diasDisponibles) {
      return {
        success: false,
        message: `El empleado no tiene saldo suficiente. Disponible: ${resumenPre.diasDisponibles}, intentás otorgar: ${diasHabiles}.`,
        data: {
          diasDisponibles: resumenPre.diasDisponibles,
          diasSolicitados: diasHabiles,
        },
      };
    }

    const [emp] = await db
      .select({
        id: empleado.id,
        nombre: empleado.nombre,
        apellidos: empleado.apellidos,
        userId: empleado.userId,
      })
      .from(empleado)
      .where(eq(empleado.id, data.empleadoId))
      .limit(1);

    if (!emp) {
      return { success: false, message: "Empleado no encontrado", data: {} };
    }

    let movimientoId = "";
    let resumenPost: ResumenSaldo | null = null;

    const snapshotOtorgamiento = {
      diasDevengadosAlOtorgar: resumenPre.diasDevengados,
      totalOtorgadosAlOtorgar: resumenPre.diasOtorgados,
      saldoRestanteAlOtorgar: resumenPre.diasDisponibles - diasHabiles,
    };

    await db.transaction(async (tx) => {
      const [nuevoMov] = await tx
        .insert(movimientoSaldoVacacion)
        .values({
          empleadoId: data.empleadoId,
          tipo: "otorgamiento",
          dias: -diasHabiles,
          motivo: data.motivo,
          realizadoPor: session.user.id,
          metadata: {
            fechaInicio: data.fechaInicio,
            fechaFin: data.fechaFin,
            dias: diasHabiles,
            ...snapshotOtorgamiento,
          },
        })
        .returning({ id: movimientoSaldoVacacion.id });
      movimientoId = nuevoMov.id;

      await refrescarCacheSaldo(tx, data.empleadoId, session.user.id);
    });

    resumenPost = await calcularSaldoEmpleado(data.empleadoId);

    await registrarAuditoria({
      tabla: "movimiento_saldo_vacacion",
      registroId: movimientoId,
      accion: "crear",
      antes: null,
      despues: {
        tipo: "otorgamiento",
        dias: diasHabiles,
        empleadoId: data.empleadoId,
        motivo: data.motivo,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
      },
      realizadoPor: session.user.id,
    });

    let emailEnviado = false;
    if (data.enviarNotificacion !== false) {
      try {
        const [userEmail] = await db
          .select({ email: sql<string>`email::text` })
          .from(sql`"user"`)
          .where(sql`id = ${emp.userId}`)
          .limit(1);

        if (userEmail?.email) {
          const html = emailService.buildVacacionOtorgadaEmailHtml({
            nombre: `${emp.nombre} ${emp.apellidos}`,
            dias: diasHabiles,
            fechaInicio: data.fechaInicio,
            fechaFin: data.fechaFin,
            motivo: data.motivo,
            saldoRestante: resumenPost.diasDisponibles,
          });

          const buffer = await generarBoletaVacacionPdf({
            empresa: { nombre: "DISTRIBUIDORA JIVIS S.A.", telefono: null },
            empleado: {
              nombre: emp.nombre,
              apellidos: emp.apellidos,
              cedula: "",
              puesto: null,
              sucursal: null,
              fechaIngreso: "",
              email: userEmail.email,
            },
            fechaEmision: new Date().toLocaleDateString("es-CR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }),
            fechaInicio: data.fechaInicio,
            fechaFin: data.fechaFin,
            dias: diasHabiles,
            diasDevengados: resumenPost.diasDevengados,
            totalOtorgados: resumenPost.diasOtorgados,
            saldoRestante: resumenPost.diasDisponibles,
            motivo: data.motivo,
            realizadoPorNombre: session.user.name ?? "RRHH",
            movimientoId,
          });
          const filename = `boleta_vacacion_${movimientoId.slice(0, 8)}.pdf`;

          emailEnviado = await emailService.sendEmailWithAttachment({
            to: userEmail.email,
            subject: `Boleta de vacaciones — ${diasHabiles} día(s)`,
            html,
            attachments: [
              { filename, content: buffer, contentType: "application/pdf" },
            ],
          });
        }
      } catch (e) {
        logger.error("SALDO_VACACION", "Error al enviar email de otorgamiento", e);
      }
    }

    revalidatePath("/dashboard/vacations");
    revalidatePath(`/dashboard/vacations`);

    const result: OtorgarVacacionResult = {
      movimientoId,
      diasDisponiblesRestantes: resumenPost.diasDisponibles,
      emailEnviado,
    };

    return {
      success: true,
      message: `Vacaciones otorgadas correctamente. Saldo restante: ${resumenPost.diasDisponibles} día(s).`,
      data: result,
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al otorgar vacaciones:", error);
    return { success: false, message: "Error al otorgar vacaciones", data: {} };
  }
}

export async function ajustarSaldo(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const { session, role } = await getSessionAndRole();
    if (!session?.user) return unauthorized();
    if (role !== "admin" && role !== "rrhh") {
      return forbidden("Solo RRHH y Admin pueden ajustar el saldo");
    }

    const valibot = await import("valibot");
    const parsed = valibot.safeParse(AjusteSaldoSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }
    const data: AjusteSaldoData = parsed.output;

    if (data.dias === 0) {
      return { success: false, message: "Los días no pueden ser 0.", data: {} };
    }

    const [emp] = await db
      .select({ id: empleado.id })
      .from(empleado)
      .where(eq(empleado.id, data.empleadoId))
      .limit(1);

    if (!emp) {
      return { success: false, message: "Empleado no encontrado", data: {} };
    }

    const tipo = data.dias > 0 ? "ajuste_positivo" : "ajuste_negativo";

    let movimientoId = "";
    let resumenPost: ResumenSaldo | null = null;

    await db.transaction(async (tx) => {
      const [nuevoMov] = await tx
        .insert(movimientoSaldoVacacion)
        .values({
          empleadoId: data.empleadoId,
          tipo,
          dias: data.dias,
          motivo: data.motivo,
          realizadoPor: session.user.id,
        })
        .returning({ id: movimientoSaldoVacacion.id });
      movimientoId = nuevoMov.id;

      await refrescarCacheSaldo(tx, data.empleadoId, session.user.id);
    });

    resumenPost = await calcularSaldoEmpleado(data.empleadoId);

    await registrarAuditoria({
      tabla: "movimiento_saldo_vacacion",
      registroId: movimientoId,
      accion: "crear",
      antes: null,
      despues: {
        tipo,
        dias: data.dias,
        empleadoId: data.empleadoId,
        motivo: data.motivo,
      },
      realizadoPor: session.user.id,
    });

    revalidatePath("/dashboard/vacations");

    return {
      success: true,
      message: `Ajuste aplicado. Saldo actual: ${resumenPost.diasDisponibles} día(s).`,
      data: { movimientoId, diasDisponibles: resumenPost.diasDisponibles },
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al ajustar saldo:", error);
    return { success: false, message: "Error al ajustar saldo", data: {} };
  }
}

export async function calcularDiasHabilesAction(input: {
  fechaInicio: string;
  fechaFin: string;
}): Promise<ActionResponse> {
  try {
    const { session } = await getSessionAndRole();
    if (!session?.user) return unauthorized();

    const dias = await calcularDiasHabiles(input.fechaInicio, input.fechaFin);
    return {
      success: true,
      message: "Días hábiles calculados",
      data: { dias },
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al calcular días hábiles:", error);
    return { success: false, message: "Error al calcular", data: {} };
  }
}

// ── Boleta PDF ────────────────────────────────────────────────────────────────

interface MovimientoConRelaciones {
  movimiento: {
    id: string;
    empleadoId: string;
    tipo: string;
    dias: number;
    motivo: string;
    metadata: unknown;
    fecha: Date;
  };
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    cedula: string;
    fechaIngreso: string;
    userId: string | null;
    puestoNombre: string | null;
    sucursalNombre: string | null;
    email: string | null;
  } | null;
  realizadoPorNombre: string | null;
}

async function cargarMovimientoParaBoleta(
  movimientoId: string,
): Promise<MovimientoConRelaciones | null> {
  const [row] = await db
    .select({
      id: movimientoSaldoVacacion.id,
      empleadoId: movimientoSaldoVacacion.empleadoId,
      tipo: movimientoSaldoVacacion.tipo,
      dias: movimientoSaldoVacacion.dias,
      motivo: movimientoSaldoVacacion.motivo,
      metadata: movimientoSaldoVacacion.metadata,
      fecha: movimientoSaldoVacacion.fecha,
      empleado: {
        id: sql<string>`e.id`,
        nombre: sql<string>`e.nombre`,
        apellidos: sql<string>`e.apellidos`,
        cedula: sql<string>`e.cedula::text`,
        fechaIngreso: sql<string>`e.fecha_ingreso::text`,
        userId: sql<string>`e.user_id`,
        puestoNombre: sql<string>`(SELECT nombre FROM puesto WHERE puesto.id = e.puesto_id)`,
        sucursalNombre: sql<string>`(SELECT nombre FROM sucursal WHERE sucursal.id = e.sucursal_id)`,
        email: sql<string>`(SELECT email FROM "user" WHERE "user".id = e.user_id)`,
      },
      realizadoPorNombre: sql<string>`(
        SELECT name FROM "user" WHERE "user".id = ${movimientoSaldoVacacion.realizadoPor}
      )`,
    })
    .from(movimientoSaldoVacacion)
    .innerJoin(sql`empleado e`, sql`e.id = ${movimientoSaldoVacacion.empleadoId}`)
    .where(eq(movimientoSaldoVacacion.id, movimientoId))
    .limit(1);

  if (!row) return null;

  return {
    movimiento: {
      id: row.id,
      empleadoId: row.empleadoId,
      tipo: row.tipo,
      dias: row.dias,
      motivo: row.motivo,
      metadata: row.metadata,
      fecha: row.fecha,
    },
    empleado: row.empleado
      ? {
          id: row.empleado.id,
          nombre: row.empleado.nombre,
          apellidos: row.empleado.apellidos,
          cedula: row.empleado.cedula,
          fechaIngreso: row.empleado.fechaIngreso,
          userId: row.empleado.userId,
          puestoNombre: row.empleado.puestoNombre ?? null,
          sucursalNombre: row.empleado.sucursalNombre ?? null,
          email: row.empleado.email ?? null,
        }
      : null,
    realizadoPorNombre: row.realizadoPorNombre,
  };
}

async function verificarAccesoMovimiento(
  session: { user: { id: string } },
  role: Role,
  empId: string,
): Promise<boolean> {
  if (role === "admin" || role === "rrhh") return true;
  const [emp] = await db
    .select({ id: empleado.id })
    .from(empleado)
    .where(eq(empleado.userId, session.user.id))
    .limit(1);
  return emp?.id === empId;
}

interface BoletaSnapshot {
  fechaEmision: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  diasDevengados: number;
  totalOtorgados: number;
  saldoRestante: number;
}

interface SnapshotOtorgamiento {
  diasDevengadosAlOtorgar?: number;
  totalOtorgadosAlOtorgar?: number;
  saldoRestanteAlOtorgar?: number;
}

interface MetaOtorgamiento extends SnapshotOtorgamiento {
  fechaInicio?: string;
  fechaFin?: string;
  dias?: number;
}

/**
 * Construye los datos para la boleta usando el snapshot guardado en metadata
 * al momento de la creación del movimiento. Si no hay snapshot (movimiento
 * legacy), usa el cálculo actual como fallback.
 */
async function construirSnapshotBoleta(
  data: NonNullable<Awaited<ReturnType<typeof cargarMovimientoParaBoleta>>>,
): Promise<BoletaSnapshot> {
  const meta = (data.movimiento.metadata ?? {}) as MetaOtorgamiento;
  const resumenActual = await calcularSaldoEmpleado(data.movimiento.empleadoId);

  if (
    typeof meta.diasDevengadosAlOtorgar === "number" &&
    typeof meta.totalOtorgadosAlOtorgar === "number" &&
    typeof meta.saldoRestanteAlOtorgar === "number"
  ) {
    return {
      fechaEmision: new Date(data.movimiento.fecha).toLocaleDateString(
        "es-CR",
        { year: "numeric", month: "2-digit", day: "2-digit" },
      ),
      fechaInicio: meta.fechaInicio ?? "",
      fechaFin: meta.fechaFin ?? "",
      dias: Math.abs(data.movimiento.dias),
      diasDevengados: meta.diasDevengadosAlOtorgar,
      totalOtorgados: meta.totalOtorgadosAlOtorgar,
      saldoRestante: meta.saldoRestanteAlOtorgar,
    };
  }

  return {
    fechaEmision: new Date(data.movimiento.fecha).toLocaleDateString(
      "es-CR",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    ),
    fechaInicio: meta.fechaInicio ?? "",
    fechaFin: meta.fechaFin ?? "",
    dias: Math.abs(data.movimiento.dias),
    diasDevengados: resumenActual.diasDevengados,
    totalOtorgados: resumenActual.diasOtorgados,
    saldoRestante: resumenActual.diasDisponibles,
  };
}

export async function generarBoletaVacacion(input: {
  movimientoId: string;
}): Promise<ActionResponse> {
  try {
    const { session, role } = await getSessionAndRole();
    if (!session?.user) return unauthorized();

    const data = await cargarMovimientoParaBoleta(input.movimientoId);
    if (!data) {
      return { success: false, message: "Movimiento no encontrado", data: {} };
    }

    if (data.movimiento.tipo !== "otorgamiento") {
      return {
        success: false,
        message: "Solo los otorgamientos generan boleta",
        data: {},
      };
    }

    const tieneAcceso = await verificarAccesoMovimiento(
      session,
      role,
      data.movimiento.empleadoId,
    );
    if (!tieneAcceso) {
      return forbidden("No tenés acceso a esta boleta");
    }

    if (!data.empleado) {
      return { success: false, message: "Empleado no encontrado", data: {} };
    }

    const snapshot = await construirSnapshotBoleta(data);

    const buffer = await generarBoletaVacacionPdf({
      empresa: {
        nombre: "DISTRIBUIDORA JIVIS S.A.",
        telefono: null,
      },
      empleado: {
        nombre: data.empleado.nombre,
        apellidos: data.empleado.apellidos,
        cedula: data.empleado.cedula,
        puesto: data.empleado.puestoNombre,
        sucursal: data.empleado.sucursalNombre,
        fechaIngreso: data.empleado.fechaIngreso,
        email: data.empleado.email,
      },
      fechaEmision: snapshot.fechaEmision,
      fechaInicio: snapshot.fechaInicio,
      fechaFin: snapshot.fechaFin,
      dias: snapshot.dias,
      diasDevengados: snapshot.diasDevengados,
      totalOtorgados: snapshot.totalOtorgados,
      saldoRestante: snapshot.saldoRestante,
      motivo: data.movimiento.motivo,
      realizadoPorNombre: data.realizadoPorNombre ?? "RRHH",
      movimientoId: data.movimiento.id,
    });

    const filename = `boleta_vacacion_${data.empleado.cedula}_${data.movimiento.id.slice(0, 8)}.pdf`;

    return {
      success: true,
      message: "Boleta generada",
      data: {
        base64: buffer.toString("base64"),
        filename,
        contentType: "application/pdf",
      },
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al generar boleta:", error);
    return { success: false, message: "Error al generar boleta", data: {} };
  }
}

export async function reenviarBoletaEmail(input: {
  movimientoId: string;
}): Promise<ActionResponse> {
  try {
    const { session, role } = await getSessionAndRole();
    if (!session?.user) return unauthorized();
    if (role !== "admin" && role !== "rrhh") {
      return forbidden("Solo RRHH y Admin pueden reenviar la boleta");
    }

    const data = await cargarMovimientoParaBoleta(input.movimientoId);
    if (!data) {
      return { success: false, message: "Movimiento no encontrado", data: {} };
    }

    if (data.movimiento.tipo !== "otorgamiento") {
      return {
        success: false,
        message: "Solo los otorgamientos tienen boleta",
        data: {},
      };
    }

    if (!data.empleado?.email) {
      return {
        success: false,
        message: "El empleado no tiene email registrado",
        data: {},
      };
    }

    const snapshot = await construirSnapshotBoleta(data);
    const dias = snapshot.dias;

    const buffer = await generarBoletaVacacionPdf({
      empresa: { nombre: "DISTRIBUIDORA JIVIS S.A.", telefono: null },
      empleado: {
        nombre: data.empleado.nombre,
        apellidos: data.empleado.apellidos,
        cedula: data.empleado.cedula,
        puesto: data.empleado.puestoNombre,
        sucursal: data.empleado.sucursalNombre,
        fechaIngreso: data.empleado.fechaIngreso,
        email: data.empleado.email,
      },
      fechaEmision: snapshot.fechaEmision,
      fechaInicio: snapshot.fechaInicio,
      fechaFin: snapshot.fechaFin,
      dias,
      diasDevengados: snapshot.diasDevengados,
      totalOtorgados: snapshot.totalOtorgados,
      saldoRestante: snapshot.saldoRestante,
      motivo: data.movimiento.motivo,
      realizadoPorNombre: data.realizadoPorNombre ?? "RRHH",
      movimientoId: data.movimiento.id,
    });

    const filename = `boleta_vacacion_${data.empleado.cedula}_${data.movimiento.id.slice(0, 8)}.pdf`;

    const html = emailService.buildVacacionOtorgadaEmailHtml({
      nombre: `${data.empleado.nombre} ${data.empleado.apellidos}`,
      dias,
      fechaInicio: snapshot.fechaInicio,
      fechaFin: snapshot.fechaFin,
      motivo: data.movimiento.motivo,
      saldoRestante: snapshot.saldoRestante,
    });

    const ok = await emailService.sendEmailWithAttachment({
      to: data.empleado.email,
      subject: `Boleta de vacaciones — ${dias} día(s)`,
      html,
      attachments: [
        { filename, content: buffer, contentType: "application/pdf" },
      ],
    });

    if (!ok) {
      return {
        success: false,
        message:
          "No se pudo enviar el email. Verificá la configuración del servidor SMTP.",
        data: {},
      };
    }

    return {
      success: true,
      message: `Boleta reenviada a ${data.empleado.email}`,
      data: { email: data.empleado.email },
    };
  } catch (error) {
    logger.error("SALDO_VACACION", "Error al reenviar boleta:", error);
    return { success: false, message: "Error al reenviar boleta", data: {} };
  }
}

