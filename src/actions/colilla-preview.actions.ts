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
import { user } from "@/db/schema/auth.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { eq } from "drizzle-orm";
import { buildColillaPagoHtml } from "@/lib/colilla-html";
import { logger } from "@/lib/logger";

export async function getColillaPreview(
  detalleId: string,
): Promise<ActionResponse> {
  if (process.env.NODE_ENV !== "development") {
    return {
      success: false,
      message: "El preview del email solo está disponible en modo desarrollo",
      data: {},
    };
  }

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
        message: "No tenés permisos para previsualizar colillas",
        data: {},
      };
    }

    const [row] = await db
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
      .leftJoin(user, eq(empleado.userId, user.id))
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .leftJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(eq(detallePlanilla.id, detalleId))
      .limit(1);

    if (!row) {
      return {
        success: false,
        message: "Detalle de planilla no encontrado",
        data: {},
      };
    }

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, row.detalle.planillaId))
      .limit(1);

    if (!planillaData) {
      return {
        success: false,
        message: "Planilla no encontrada",
        data: {},
      };
    }

    const deduccionesEmp = await db
      .select()
      .from(deduccionAdicional)
      .where(eq(deduccionAdicional.detallePlanillaId, detalleId));

    const ingresosEmp = await db
      .select()
      .from(ingresoExtra)
      .where(eq(ingresoExtra.detallePlanillaId, detalleId));

    const html = buildColillaPagoHtml({
      nombre: `${row.empleadoNombre} ${row.empleadoApellidos}`,
      cedula: row.empleadoCedula,
      sucursal: row.sucursalNombre,
      puesto: row.puestoNombre,
      periodoInicio: planillaData.fechaInicio,
      periodoFin: planillaData.fechaFin,
      fechaPago: planillaData.fechaPago,
      tipo: planillaData.tipo,
      salarioBruto: row.detalle.salarioBruto,
      horasExtra: row.detalle.horasExtra,
      horasLaboradas: row.detalle.horasLaboradas,
      montoHorasExtra: row.detalle.montoHorasExtra,
      totalIngresosExtras: row.detalle.totalIngresosExtras,
      ingresosExtras: ingresosEmp.map((i) => ({
        concepto: i.concepto,
        monto: i.monto,
      })),
      desgloseDeduccionesLegales: row.detalle.desgloseDeduccionesLegales ?? [],
      impuestoRenta: row.detalle.impuestoRenta,
      totalDeduccionesLegales: row.detalle.totalDeduccionesLegales,
      totalDeduccionesAdicionales: row.detalle.totalDeduccionesAdicionales,
      deduccionesAdicionales: deduccionesEmp.map((dd) => ({
        concepto: dd.concepto,
        monto: dd.monto,
      })),
      salarioNeto: row.detalle.salarioNeto,
    });

    return {
      success: true,
      message: "Preview generado",
      data: {
        html,
        empleadoNombre: `${row.empleadoNombre} ${row.empleadoApellidos}`,
        empleadoCedula: row.empleadoCedula,
        planillaId: planillaData.id,
        periodo: `${planillaData.fechaInicio} a ${planillaData.fechaFin}`,
        tipo: planillaData.tipo,
        estado: planillaData.estado,
      },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al generar preview de colilla:", error);
    return {
      success: false,
      message: "Error al generar preview",
      data: {},
    };
  }
}
