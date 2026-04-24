"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { detallePlanilla } from "@/db/schema/detalle-planilla.schema";
import { deduccionAdicional } from "@/db/schema/deduccion-adicional.schema";
import { ingresoExtra } from "@/db/schema/ingreso-extra.schema";
import { planilla } from "@/db/schema/planilla.schema";
import { empleado } from "@/db/schema/empleado.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { eq, sql, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function exportarPlanillaExcel(
  planillaId: string,
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

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, planillaId))
      .limit(1);

    if (!planillaData) {
      return { success: false, message: "Planilla no encontrada", data: {} };
    }

    const detalles = await db
      .select({
        detalle: detallePlanilla,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
      })
      .from(detallePlanilla)
      .innerJoin(empleado, eq(detallePlanilla.empleadoId, empleado.id))
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .leftJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(eq(detallePlanilla.planillaId, planillaId))
      .orderBy(empleado.apellidos, empleado.nombre);

    const detalleIds = detalles.map((d) => d.detalle.id);

    const deducciones =
      detalleIds.length > 0
        ? await db
            .select()
            .from(deduccionAdicional)
            .where(inArray(deduccionAdicional.detallePlanillaId, detalleIds))
        : [];

    const ingresos =
      detalleIds.length > 0
        ? await db
            .select()
            .from(ingresoExtra)
            .where(inArray(ingresoExtra.detallePlanillaId, detalleIds))
        : [];

    const XLSX = await import("xlsx");

    const header = [
      "Empleado",
      "Cédula",
      "Sucursal",
      "Puesto",
      "Salario Bruto",
      "Horas Ordinarias",
      "Horas Extra",
      "Monto H.E.",
      "Ingresos Extra",
      "CCSS",
      "INS",
      "Imp. Renta",
      "Banco Popular",
      "Total Ded. Legales",
      "Ded. Adicionales",
      "Salario Neto",
    ];

    const rows = detalles.map((d) => {
      const dedEmp = deducciones
        .filter((dd) => dd.detallePlanillaId === d.detalle.id)
        .reduce((s, dd) => s + parseFloat(dd.monto), 0);
      const ingEmp = ingresos
        .filter((i) => i.detallePlanillaId === d.detalle.id)
        .reduce((s, i) => s + parseFloat(i.monto), 0);

      return [
        `${d.empleadoNombre} ${d.empleadoApellidos}`,
        d.empleadoCedula,
        d.sucursalNombre || "",
        d.puestoNombre || "",
        parseFloat(d.detalle.salarioBruto),
        parseFloat(d.detalle.horasOrdinarias),
        parseFloat(d.detalle.horasExtra),
        parseFloat(d.detalle.montoHorasExtra),
        ingEmp,
        parseFloat(d.detalle.ccssEmpleado),
        parseFloat(d.detalle.insEmpleado),
        parseFloat(d.detalle.impuestoRenta),
        parseFloat(d.detalle.bancoPopular),
        parseFloat(d.detalle.totalDeduccionesLegales),
        dedEmp,
        parseFloat(d.detalle.salarioNeto),
      ];
    });

    const totalesRow = [
      "TOTALES",
      "",
      "",
      "",
      parseFloat(planillaData.totalSalariosBrutos),
      0,
      0,
      parseFloat(planillaData.totalHorasExtra),
      0,
      0,
      0,
      0,
      0,
      parseFloat(planillaData.totalDeduccionesLegales),
      parseFloat(planillaData.totalDeduccionesAdicionales),
      parseFloat(planillaData.totalSalariosNeto),
    ];

    const wsData = [header, ...rows, totalesRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = header.map((_, i) => ({
      wch: i < 4 ? 25 : 16,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Planilla");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = Buffer.from(buf).toString("base64");

    return {
      success: true,
      message: "Excel generado",
      data: {
        base64,
        filename: `planilla_${planillaData.tipo}_${planillaData.fechaInicio}_${planillaData.fechaFin}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al exportar Excel:", error);
    return { success: false, message: "Error al exportar Excel", data: {} };
  }
}

export async function exportarPlanillaPDF(
  planillaId: string,
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

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, planillaId))
      .limit(1);

    if (!planillaData) {
      return { success: false, message: "Planilla no encontrada", data: {} };
    }

    const detalles = await db
      .select({
        detalle: detallePlanilla,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
      })
      .from(detallePlanilla)
      .innerJoin(empleado, eq(detallePlanilla.empleadoId, empleado.id))
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .leftJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(eq(detallePlanilla.planillaId, planillaId))
      .orderBy(empleado.apellidos, empleado.nombre);

    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text(
      `Planilla ${planillaData.tipo} — ${planillaData.fechaInicio} a ${planillaData.fechaFin}`,
      14,
      20,
    );
    doc.setFontSize(10);
    doc.text(
      `Total empleados: ${planillaData.totalEmpleados} | Total neto: ¢${parseFloat(planillaData.totalSalariosNeto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`,
      14,
      28,
    );

    const fmt = (n: string) =>
      parseFloat(n).toLocaleString("es-CR", { minimumFractionDigits: 2 });

    const body = detalles.map((d) => [
      `${d.empleadoNombre} ${d.empleadoApellidos}`,
      d.empleadoCedula,
      d.puestoNombre || "",
      `¢${fmt(d.detalle.salarioBruto)}`,
      `¢${fmt(d.detalle.montoHorasExtra)}`,
      `¢${fmt(d.detalle.totalDeduccionesLegales)}`,
      `¢${fmt(d.detalle.totalDeduccionesAdicionales)}`,
      `¢${fmt(d.detalle.salarioNeto)}`,
    ]);

    autoTable(doc, {
      startY: 34,
      head: [
        [
          "Empleado",
          "Cédula",
          "Puesto",
          "Bruto",
          "H.E.",
          "Ded. Legales",
          "Ded. Adic.",
          "Neto",
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
        filename: `planilla_${planillaData.tipo}_${planillaData.fechaInicio}_${planillaData.fechaFin}.pdf`,
        contentType: "application/pdf",
      },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al exportar PDF:", error);
    return { success: false, message: "Error al exportar PDF", data: {} };
  }
}
