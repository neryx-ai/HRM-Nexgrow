"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { empleado } from "@/db/schema/empleado.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { planilla } from "@/db/schema/planilla.schema";
import { detallePlanilla } from "@/db/schema/detalle-planilla.schema";
import { resumenAsistenciaDiaria } from "@/db/schema/resumen-asistencia-diaria.schema";
import { eq, sql, and, gte, lte, sum, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

function fmtCRC(n: string | number) {
  return parseFloat(String(n)).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function exportarReporteAsistenciaExcel(
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
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return {
        success: false,
        message: "No tenés permisos para exportar",
        data: {},
      };
    }

    const conditions = [
      gte(resumenAsistenciaDiaria.fecha, fechaInicio),
      lte(resumenAsistenciaDiaria.fecha, fechaFin),
    ];
    if (sucursalId) conditions.push(eq(empleado.sucursalId, sucursalId));
    if (empleadoId)
      conditions.push(eq(resumenAsistenciaDiaria.empleadoId, empleadoId));

    const registros = await db
      .select({
        fecha: resumenAsistenciaDiaria.fecha,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        sucursalNombre: sucursal.nombre,
        horasOrdinarias: resumenAsistenciaDiaria.horasOrdinarias,
        horasExtra: resumenAsistenciaDiaria.horasExtra,
        ausente: resumenAsistenciaDiaria.ausente,
        retraso: resumenAsistenciaDiaria.retraso,
        minutosRetraso: resumenAsistenciaDiaria.minutosRetraso,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(
        empleado,
        eq(resumenAsistenciaDiaria.empleadoId, empleado.id),
      )
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(and(...conditions))
      .orderBy(desc(resumenAsistenciaDiaria.fecha));

    const XLSX = await import("xlsx");

    const header = [
      "Fecha",
      "Empleado",
      "Sucursal",
      "Horas Ord.",
      "Horas Extra",
      "Ausente",
      "Retraso",
      "Min. Retraso",
    ];

    const rows = registros.map((r) => [
      r.fecha,
      `${r.empleadoNombre} ${r.empleadoApellidos}`,
      r.sucursalNombre || "",
      parseFloat(r.horasOrdinarias),
      parseFloat(r.horasExtra),
      r.ausente ? "Sí" : "No",
      r.retraso ? "Sí" : "No",
      parseFloat(r.minutosRetraso),
    ]);

    const wsData = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = header.map((_, i) => ({ wch: i < 3 ? 25 : 14 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = Buffer.from(buf).toString("base64");

    return {
      success: true,
      message: "Excel generado",
      data: {
        base64,
        filename: `reporte_asistencia_${fechaInicio}_${fechaFin}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al exportar asistencia Excel:", error);
    return {
      success: false,
      message: "Error al exportar reporte",
      data: {},
    };
  }
}

export async function exportarReporteAsistenciaPDF(
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
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (!["admin", "rrhh"].includes(userRole)) {
      return {
        success: false,
        message: "No tenés permisos para exportar",
        data: {},
      };
    }

    const conditions = [
      gte(resumenAsistenciaDiaria.fecha, fechaInicio),
      lte(resumenAsistenciaDiaria.fecha, fechaFin),
    ];
    if (sucursalId) conditions.push(eq(empleado.sucursalId, sucursalId));
    if (empleadoId)
      conditions.push(eq(resumenAsistenciaDiaria.empleadoId, empleadoId));

    const registros = await db
      .select({
        fecha: resumenAsistenciaDiaria.fecha,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        sucursalNombre: sucursal.nombre,
        horasOrdinarias: resumenAsistenciaDiaria.horasOrdinarias,
        horasExtra: resumenAsistenciaDiaria.horasExtra,
        ausente: resumenAsistenciaDiaria.ausente,
        retraso: resumenAsistenciaDiaria.retraso,
        minutosRetraso: resumenAsistenciaDiaria.minutosRetraso,
      })
      .from(resumenAsistenciaDiaria)
      .innerJoin(
        empleado,
        eq(resumenAsistenciaDiaria.empleadoId, empleado.id),
      )
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .where(and(...conditions))
      .orderBy(desc(resumenAsistenciaDiaria.fecha));

    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text(
      `Reporte de Asistencia — ${fechaInicio} a ${fechaFin}`,
      14,
      20,
    );
    doc.setFontSize(10);
    doc.text(`Total registros: ${registros.length}`, 14, 28);

    const body = registros.map((r) => [
      r.fecha,
      `${r.empleadoNombre} ${r.empleadoApellidos}`,
      r.sucursalNombre || "",
      parseFloat(r.horasOrdinarias).toFixed(1),
      parseFloat(r.horasExtra).toFixed(1),
      r.ausente ? "Sí" : "No",
      r.retraso ? "Sí" : "No",
      `${parseFloat(r.minutosRetraso).toFixed(0)} min`,
    ]);

    autoTable(doc, {
      startY: 34,
      head: [
        [
          "Fecha",
          "Empleado",
          "Sucursal",
          "H. Ord.",
          "H. Extra",
          "Ausente",
          "Retraso",
          "Min. Retraso",
        ],
      ],
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [28, 25, 23] },
    });

    const buf = Buffer.from(doc.output("arraybuffer"));
    const base64 = buf.toString("base64");

    return {
      success: true,
      message: "PDF generado",
      data: {
        base64,
        filename: `reporte_asistencia_${fechaInicio}_${fechaFin}.pdf`,
        contentType: "application/pdf",
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al exportar asistencia PDF:", error);
    return {
      success: false,
      message: "Error al exportar reporte",
      data: {},
    };
  }
}

export async function exportarReporteCostosExcel(
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
        message: "No tenés permisos para exportar",
        data: {},
      };
    }

    const costos = await db
      .select({
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
      .groupBy(sucursal.nombre)
      .orderBy(desc(sum(detallePlanilla.salarioNeto)));

    const XLSX = await import("xlsx");

    const header = [
      "Sucursal",
      "Empleados",
      "Total Bruto",
      "Total Deducciones",
      "Total H.E.",
      "Total Neto",
    ];

    const rows = costos.map((c) => [
      c.sucursalNombre,
      c.totalEmpleados,
      parseFloat(c.totalBruto || "0"),
      parseFloat(c.totalDeducciones || "0"),
      parseFloat(c.totalHorasExtra || "0"),
      parseFloat(c.totalNeto || "0"),
    ]);

    const wsData = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = header.map((_, i) => ({ wch: i === 0 ? 25 : 16 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costos por Sucursal");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = Buffer.from(buf).toString("base64");

    return {
      success: true,
      message: "Excel generado",
      data: {
        base64,
        filename: `reporte_costos_sucursal_${fechaInicio}_${fechaFin}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al exportar costos Excel:", error);
    return {
      success: false,
      message: "Error al exportar reporte",
      data: {},
    };
  }
}

export async function exportarReporteCostosPDF(
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
        message: "No tenés permisos para exportar",
        data: {},
      };
    }

    const costos = await db
      .select({
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
      .groupBy(sucursal.nombre)
      .orderBy(desc(sum(detallePlanilla.salarioNeto)));

    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text(
      `Reporte Costos por Sucursal — ${fechaInicio} a ${fechaFin}`,
      14,
      20,
    );

    const body = costos.map((c) => [
      c.sucursalNombre,
      c.totalEmpleados,
      `¢${fmtCRC(c.totalBruto || "0")}`,
      `¢${fmtCRC(c.totalDeducciones || "0")}`,
      `¢${fmtCRC(c.totalHorasExtra || "0")}`,
      `¢${fmtCRC(c.totalNeto || "0")}`,
    ]);

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Sucursal",
          "Empleados",
          "Total Bruto",
          "Total Ded.",
          "Total H.E.",
          "Total Neto",
        ],
      ],
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [28, 25, 23] },
    });

    const buf = Buffer.from(doc.output("arraybuffer"));
    const base64 = buf.toString("base64");

    return {
      success: true,
      message: "PDF generado",
      data: {
        base64,
        filename: `reporte_costos_sucursal_${fechaInicio}_${fechaFin}.pdf`,
        contentType: "application/pdf",
      },
    };
  } catch (error) {
    logger.error("REPORTES", "Error al exportar costos PDF:", error);
    return {
      success: false,
      message: "Error al exportar reporte",
      data: {},
    };
  }
}
