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

export async function getReporteAsistencia(
  fechaInicio: string,
  fechaFin: string,
  sucursalId?: string,
  empleadoId?: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "No autorizado",
        data: {},
      };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return {
        success: false,
        message: "No tenés permisos para ver reportes",
        data: {},
      };
    }

    const conditions = [
      gte(resumenAsistenciaDiaria.fecha, fechaInicio),
      lte(resumenAsistenciaDiaria.fecha, fechaFin),
    ];

    if (sucursalId) {
      conditions.push(eq(empleado.sucursalId, sucursalId));
    }
    if (empleadoId) {
      conditions.push(eq(resumenAsistenciaDiaria.empleadoId, empleadoId));
    }

    const registros = await db
      .select({
        fecha: resumenAsistenciaDiaria.fecha,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalNombre: sucursal.nombre,
        horasOrdinarias: resumenAsistenciaDiaria.horasOrdinarias,
        horasExtra: resumenAsistenciaDiaria.horasExtra,
        ausente: resumenAsistenciaDiaria.ausente,
        retraso: resumenAsistenciaDiaria.retraso,
        minutosRetraso: resumenAsistenciaDiaria.minutosRetraso,
        horaEntrada: resumenAsistenciaDiaria.horaEntrada,
        horaSalida: resumenAsistenciaDiaria.horaSalida,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(
        empleado,
        eq(resumenAsistenciaDiaria.empleadoId, empleado.id),
      )
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(and(...conditions))
      .orderBy(desc(resumenAsistenciaDiaria.fecha));

    const resumenConditions = [
      gte(resumenAsistenciaDiaria.fecha, fechaInicio),
      lte(resumenAsistenciaDiaria.fecha, fechaFin),
    ];
    if (sucursalId) {
      resumenConditions.push(eq(empleado.sucursalId, sucursalId));
    }
    if (empleadoId) {
      resumenConditions.push(eq(resumenAsistenciaDiaria.empleadoId, empleadoId));
    }

    const [resumen] = await db
      .select({
        totalRegistros: count(),
        totalAusencias:
          sql<number>`sum(case when ${resumenAsistenciaDiaria.ausente} = true then 1 else 0 end)`,
        totalRetrasos:
          sql<number>`sum(case when ${resumenAsistenciaDiaria.retraso} = true then 1 else 0 end)`,
        totalHorasOrdinarias: sum(resumenAsistenciaDiaria.horasOrdinarias),
        totalHorasExtra: sum(resumenAsistenciaDiaria.horasExtra),
        promedioRetrasoMinutos: sql<number>`avg(case when ${resumenAsistenciaDiaria.retraso} = true then ${resumenAsistenciaDiaria.minutosRetraso} else 0 end)`,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(
        empleado,
        eq(resumenAsistenciaDiaria.empleadoId, empleado.id),
      )
      .where(and(...resumenConditions));

    return {
      success: true,
      message: "Reporte de asistencia generado",
      data: {
        registros,
        resumen: resumen || {
          totalRegistros: 0,
          totalAusencias: 0,
          totalRetrasos: 0,
          totalHorasOrdinarias: "0",
          totalHorasExtra: "0",
          promedioRetrasoMinutos: "0",
        },
        filtros: { fechaInicio, fechaFin, sucursalId, empleadoId },
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al generar reporte asistencia:", error);
    return {
      success: false,
      message: "Error al generar reporte",
      data: {},
    };
  }
}

export async function getReporteCostosSucursal(
  fechaInicio: string,
  fechaFin: string,
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
        message: "No tenés permisos para ver reportes",
        data: {},
      };
    }

    const costosPorSucursal = await db
      .select({
        sucursalId: sucursal.id,
        sucursalNombre: sucursal.nombre,
        totalBruto: sum(detallePlanilla.salarioBruto),
        totalNeto: sum(detallePlanilla.salarioNeto),
        totalDeducciones: sum(detallePlanilla.totalDeduccionesLegales),
        totalHorasExtra: sum(detallePlanilla.montoHorasExtra),
        totalEmpleados:
          sql<number>`count(distinct ${detallePlanilla.empleadoId})`,
      })
      .from(detallePlanilla)
      .innerJoin(planilla, eq(detallePlanilla.planillaId, planilla.id))
      .innerJoin(empleado, eq(detallePlanilla.empleadoId, empleado.id))
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(
        and(
          eq(planilla.estado, "procesada"),
          gte(planilla.fechaInicio, fechaInicio),
          lte(planilla.fechaFin, fechaFin),
        ),
      )
      .groupBy(sucursal.id, sucursal.nombre)
      .orderBy(desc(sum(detallePlanilla.salarioNeto)));

    const [totales] = await db
      .select({
        totalBruto: sum(detallePlanilla.salarioBruto),
        totalNeto: sum(detallePlanilla.salarioNeto),
        totalDeducciones: sum(detallePlanilla.totalDeduccionesLegales),
        totalHorasExtra: sum(detallePlanilla.montoHorasExtra),
      })
      .from(detallePlanilla)
      .innerJoin(planilla, eq(detallePlanilla.planillaId, planilla.id))
      .where(
        and(
          eq(planilla.estado, "procesada"),
          gte(planilla.fechaInicio, fechaInicio),
          lte(planilla.fechaFin, fechaFin),
        ),
      );

    return {
      success: true,
      message: "Reporte de costos por sucursal generado",
      data: {
        costosPorSucursal,
        totales: totales || {
          totalBruto: "0",
          totalNeto: "0",
          totalDeducciones: "0",
          totalHorasExtra: "0",
        },
        filtros: { fechaInicio, fechaFin },
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al generar reporte costos:", error);
    return {
      success: false,
      message: "Error al generar reporte",
      data: {},
    };
  }
}

export async function getReportePlanilla(
  fechaInicio: string,
  fechaFin: string,
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
        message: "No tenés permisos para ver reportes",
        data: {},
      };
    }

    const planillas = await db
      .select({
        id: planilla.id,
        tipo: planilla.tipo,
        estado: planilla.estado,
        fechaInicio: planilla.fechaInicio,
        fechaFin: planilla.fechaFin,
        totalEmpleados: planilla.totalEmpleados,
        totalSalariosBrutos: planilla.totalSalariosBrutos,
        totalHorasExtra: planilla.totalHorasExtra,
        totalDeduccionesLegales: planilla.totalDeduccionesLegales,
        totalDeduccionesAdicionales: planilla.totalDeduccionesAdicionales,
        totalSalariosNeto: planilla.totalSalariosNeto,
      })
      .from(planilla)
      .where(
        and(
          gte(planilla.fechaInicio, fechaInicio),
          lte(planilla.fechaFin, fechaFin),
        ),
      )
      .orderBy(desc(planilla.fechaInicio));

    const detalles = await db
      .select({
        planillaId: detallePlanilla.planillaId,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
        salarioBruto: detallePlanilla.salarioBruto,
        horasOrdinarias: detallePlanilla.horasOrdinarias,
        horasExtra: detallePlanilla.horasExtra,
        montoHorasExtra: detallePlanilla.montoHorasExtra,
        desgloseDeduccionesLegales:
          detallePlanilla.desgloseDeduccionesLegales,
        impuestoRenta: detallePlanilla.impuestoRenta,
        totalDeduccionesLegales: detallePlanilla.totalDeduccionesLegales,
        totalDeduccionesAdicionales:
          detallePlanilla.totalDeduccionesAdicionales,
        salarioNeto: detallePlanilla.salarioNeto,
      })
      .from(detallePlanilla)
      .innerJoin(planilla, eq(detallePlanilla.planillaId, planilla.id))
      .innerJoin(empleado, eq(detallePlanilla.empleadoId, empleado.id))
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .leftJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(
        and(
          gte(planilla.fechaInicio, fechaInicio),
          lte(planilla.fechaFin, fechaFin),
        ),
      )
      .orderBy(empleado.apellidos, empleado.nombre);

    return {
      success: true,
      message: "Reporte de planilla generado",
      data: {
        planillas,
        detalles,
        filtros: { fechaInicio, fechaFin },
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al generar reporte planilla:", error);
    return {
      success: false,
      message: "Error al generar reporte",
      data: {},
    };
  }
}

export async function getMetricasRRHH(): Promise<ActionResponse> {
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

    const [totalActivos] = await db
      .select({ count: count() })
      .from(empleado)
      .where(eq(empleado.estado, "activo"));

    const [totalInactivos] = await db
      .select({ count: count() })
      .from(empleado)
      .where(eq(empleado.estado, "inactivo"));

    const ultimos30Dias = new Date();
    ultimos30Dias.setDate(ultimos30Dias.getDate() - 30);

    const [contratacionesRecientes] = await db
      .select({ count: count() })
      .from(empleado)
      .where(gte(empleado.createdAt, ultimos30Dias));

    const [desactivacionesRecientes] = await db
      .select({ count: count() })
      .from(empleado)
      .where(
        and(
          eq(empleado.estado, "inactivo"),
          gte(empleado.updatedAt, ultimos30Dias),
        ),
      );

    const empleadosPorSucursal = await db
      .select({
        sucursalNombre: sucursal.nombre,
        activos: sql<number>`count(case when ${empleado.estado} = 'activo' then 1 end)`,
        inactivos: sql<number>`count(case when ${empleado.estado} = 'inactivo' then 1 end)`,
      })
      .from(empleado)
      .innerJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .groupBy(sucursal.nombre)
      .orderBy(sucursal.nombre);

    const empleadosPorPuesto = await db
      .select({
        puestoNombre: puesto.nombre,
        total: count(),
      })
      .from(empleado)
      .innerJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(eq(empleado.estado, "activo"))
      .groupBy(puesto.nombre)
      .orderBy(desc(count()));

    const antiguedad = await db
      .select({
        rango: sql<string>`case
          when ${empleado.fechaIngreso} >= now() - interval '6 months' then '0-6 meses'
          when ${empleado.fechaIngreso} >= now() - interval '1 year' then '6-12 meses'
          when ${empleado.fechaIngreso} >= now() - interval '3 years' then '1-3 años'
          when ${empleado.fechaIngreso} >= now() - interval '5 years' then '3-5 años'
          else '5+ años'
        end`,
        total: count(),
      })
      .from(empleado)
      .where(eq(empleado.estado, "activo"))
      .groupBy(
        sql`case
          when ${empleado.fechaIngreso} >= now() - interval '6 months' then '0-6 meses'
          when ${empleado.fechaIngreso} >= now() - interval '1 year' then '6-12 meses'
          when ${empleado.fechaIngreso} >= now() - interval '3 years' then '1-3 años'
          when ${empleado.fechaIngreso} >= now() - interval '5 years' then '3-5 años'
          else '5+ años'
        end`,
      )
      .orderBy(
        sql`case
          when ${empleado.fechaIngreso} >= now() - interval '6 months' then 1
          when ${empleado.fechaIngreso} >= now() - interval '1 year' then 2
          when ${empleado.fechaIngreso} >= now() - interval '3 years' then 3
          when ${empleado.fechaIngreso} >= now() - interval '5 years' then 4
          else 5
        end`,
      );

    const tasaRotacion =
      totalActivos.count + totalInactivos.count > 0
        ? (
            (desactivacionesRecientes.count /
              (totalActivos.count + totalInactivos.count)) *
            100
          ).toFixed(1)
        : "0";

    return {
      success: true,
      message: "Métricas RRHH cargadas",
      data: {
        totalActivos: totalActivos.count,
        totalInactivos: totalInactivos.count,
        contratacionesRecientes: contratacionesRecientes.count,
        desactivacionesRecientes: desactivacionesRecientes.count,
        tasaRotacion,
        empleadosPorSucursal,
        empleadosPorPuesto,
        antiguedad,
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al cargar métricas RRHH:", error);
    return {
      success: false,
      message: "Error al cargar métricas",
      data: {},
    };
  }
}
