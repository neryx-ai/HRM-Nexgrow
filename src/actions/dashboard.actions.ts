"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { empleado } from "@/db/schema/empleado.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { planilla } from "@/db/schema/planilla.schema";
import { detallePlanilla } from "@/db/schema/detalle-planilla.schema";
import { resumenAsistenciaDiaria } from "@/db/schema/resumen-asistencia-diaria.schema";
import { saldoVacaciones } from "@/db/schema/saldo-vacaciones.schema";
import { solicitudVacacion } from "@/db/schema/solicitud-vacacion.schema";
import {
  eq,
  sql,
  and,
  gte,
  lte,
  desc,
  count,
  sum,
} from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function getDashboardAdminRRHH(): Promise<ActionResponse> {
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
        message: "No tenés permisos para ver este dashboard",
        data: {},
      };
    }

    const [totalActivos] = await db
      .select({ count: count() })
      .from(empleado)
      .where(eq(empleado.estado, "activo"));

    const [totalInactivos] = await db
      .select({ count: count() })
      .from(empleado)
      .where(eq(empleado.estado, "inactivo"));

    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const [nuevasContrataciones] = await db
      .select({ count: count() })
      .from(empleado)
      .where(gte(empleado.createdAt, treintaDiasAtras));

    const empleadosPorSucursal = await db
      .select({
        sucursalNombre: sucursal.nombre,
        total: count(),
      })
      .from(empleado)
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(eq(empleado.estado, "activo"))
      .groupBy(sucursal.nombre)
      .orderBy(desc(count()));

    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const [costoPeriodo] = await db
      .select({
        totalBruto: sum(detallePlanilla.salarioBruto),
        totalNeto: sum(detallePlanilla.salarioNeto),
      })
      .from(detallePlanilla)
      .innerJoin(planilla, eq(detallePlanilla.planillaId, planilla.id))
      .where(
        and(
          eq(planilla.estado, "procesada"),
          gte(planilla.fechaInicio, inicioMes),
          lte(planilla.fechaFin, finMes),
        ),
      );

    const ultimasPlanillas = await db
      .select({
        id: planilla.id,
        tipo: planilla.tipo,
        estado: planilla.estado,
        fechaInicio: planilla.fechaInicio,
        fechaFin: planilla.fechaFin,
        totalEmpleados: planilla.totalEmpleados,
        totalNeto: planilla.totalSalariosNeto,
      })
      .from(planilla)
      .orderBy(desc(planilla.createdAt))
      .limit(3);

    const [solicitudesVacacionPendientes] = await db
      .select({ count: count() })
      .from(solicitudVacacion)
      .where(eq(solicitudVacacion.estado, "pendiente"));

    const asistenciasHoy = new Date().toISOString().split("T")[0];
    const [asistenciaHoy] = await db
      .select({
        presentes: sql<number>`count(case when ${resumenAsistenciaDiaria.ausente} = false then 1 end)`,
        ausentes: sql<number>`count(case when ${resumenAsistenciaDiaria.ausente} = true then 1 end)`,
        retrasos: sql<number>`count(case when ${resumenAsistenciaDiaria.retraso} = true then 1 end)`,
      })
      .from(resumenAsistenciaDiaria)
      .where(eq(resumenAsistenciaDiaria.fecha, asistenciasHoy));

    return {
      success: true,
      message: "Dashboard cargado",
      data: {
        totalEmpleadosActivos: totalActivos.count,
        totalEmpleadosInactivos: totalInactivos.count,
        nuevasContrataciones: nuevasContrataciones.count,
        empleadosPorSucursal,
        costoPeriodo: {
          totalBruto: costoPeriodo?.totalBruto || "0",
          totalNeto: costoPeriodo?.totalNeto || "0",
        },
        ultimasPlanillas,
        solicitudesVacacionPendientes: solicitudesVacacionPendientes.count,
        asistenciaHoy: asistenciaHoy || {
          presentes: 0,
          ausentes: 0,
          retrasos: 0,
        },
      },
    };
  } catch (error) {
    logger.error("DASHBOARD", "Error al cargar dashboard admin:", error);
    return {
      success: false,
      message: "Error al cargar dashboard",
      data: {},
    };
  }
}

export async function getDashboardEmpleado(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const [emp] = await db
      .select({
        id: empleado.id,
        nombre: empleado.nombre,
        apellidos: empleado.apellidos,
        cedula: empleado.cedula,
        telefono: empleado.telefono,
        fechaIngreso: empleado.fechaIngreso,
        salarioBase: empleado.salarioBase,
        pin: empleado.pin,
        sucursalId: empleado.sucursalId,
        puestoId: empleado.puestoId,
        estado: empleado.estado,
      })
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

    const [suc] = emp.sucursalId
      ? await db
          .select({ nombre: sucursal.nombre })
          .from(sucursal)
          .where(eq(sucursal.id, emp.sucursalId))
          .limit(1)
      : [{ nombre: null }];

    const [puest] = emp.puestoId
      ? await db
          .select({ nombre: puesto.nombre })
          .from(puesto)
          .where(eq(puesto.id, emp.puestoId))
          .limit(1)
      : [{ nombre: null }];

    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
    const fechaStr = sieteDiasAtras.toISOString().split("T")[0];

    const asistenciaReciente = await db
      .select({
        fecha: resumenAsistenciaDiaria.fecha,
        horasOrdinarias: resumenAsistenciaDiaria.horasOrdinarias,
        horasExtra: resumenAsistenciaDiaria.horasExtra,
        ausente: resumenAsistenciaDiaria.ausente,
        retraso: resumenAsistenciaDiaria.retraso,
        minutosRetraso: resumenAsistenciaDiaria.minutosRetraso,
        horaEntrada: resumenAsistenciaDiaria.horaEntrada,
        horaSalida: resumenAsistenciaDiaria.horaSalida,
      })
      .from(resumenAsistenciaDiaria)
      .where(
        and(
          eq(resumenAsistenciaDiaria.empleadoId, emp.id),
          gte(resumenAsistenciaDiaria.fecha, fechaStr),
        ),
      )
      .orderBy(desc(resumenAsistenciaDiaria.fecha))
      .limit(7);

    const [saldo] = await db
      .select({
        diasDisponibles: saldoVacaciones.diasDisponibles,
        diasUsados: saldoVacaciones.diasUsados,
        diasOtorgados: saldoVacaciones.diasOtorgados,
        diasPendientes: saldoVacaciones.diasPendientes,
      })
      .from(saldoVacaciones)
      .where(eq(saldoVacaciones.empleadoId, emp.id))
      .orderBy(desc(saldoVacaciones.periodoInicio))
      .limit(1);

    const misSolicitudes = await db
      .select({
        fechaInicio: solicitudVacacion.fechaInicio,
        fechaFin: solicitudVacacion.fechaFin,
        diasHabiles: solicitudVacacion.diasHabiles,
        estado: solicitudVacacion.estado,
      })
      .from(solicitudVacacion)
      .where(eq(solicitudVacacion.empleadoId, emp.id))
      .orderBy(desc(solicitudVacacion.createdAt))
      .limit(5);

    const ultimasColillas = await db
      .select({
        planillaId: planilla.id,
        tipo: planilla.tipo,
        fechaInicio: planilla.fechaInicio,
        fechaFin: planilla.fechaFin,
        salarioBruto: detallePlanilla.salarioBruto,
        totalDeduccionesLegales: detallePlanilla.totalDeduccionesLegales,
        totalDeduccionesAdicionales:
          detallePlanilla.totalDeduccionesAdicionales,
        salarioNeto: detallePlanilla.salarioNeto,
      })
      .from(detallePlanilla)
      .innerJoin(planilla, eq(detallePlanilla.planillaId, planilla.id))
      .where(
        and(
          eq(detallePlanilla.empleadoId, emp.id),
          eq(planilla.estado, "procesada"),
        ),
      )
      .orderBy(desc(planilla.fechaFin))
      .limit(5);

    return {
      success: true,
      message: "Dashboard empleado cargado",
      data: {
        empleado: {
          ...emp,
          sucursalNombre: suc?.nombre || null,
          puestoNombre: puest?.nombre || null,
        },
        asistenciaReciente,
        saldoVacaciones: saldo || null,
        solicitudesVacacion: misSolicitudes,
        ultimasColillas,
      },
    };
  } catch (error) {
    logger.error("DASHBOARD", "Error al cargar dashboard empleado:", error);
    return {
      success: false,
      message: "Error al cargar dashboard",
      data: {},
    };
  }
}
