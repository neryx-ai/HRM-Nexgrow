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
import { buildColillaPagoHtml, type ColillaData } from "@/lib/colilla-html";
import { getMiEmpleado } from "@/lib/empleado";
import { logger } from "@/lib/logger";

export interface ColillaContext {
  colilla: ColillaData;
  planillaId: string;
  planillaTipo: string;
  planillaEstado: string;
  periodo: string;
  empleadoNombre: string;
  empleadoCedula: string;
  empleadoUserId: string | null;
}

export async function getColillaContextByDetalle(
  detalleId: string,
): Promise<ColillaContext | null> {
  const [row] = await db
    .select({
      detalle: detallePlanilla,
      empleadoNombre: empleado.nombre,
      empleadoApellidos: empleado.apellidos,
      empleadoCedula: empleado.cedula,
      empleadoUserId: empleado.userId,
      empleadoEmail: user.email,
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

  if (!row) return null;

  const [planillaData] = await db
    .select()
    .from(planilla)
    .where(eq(planilla.id, row.detalle.planillaId))
    .limit(1);

  if (!planillaData) return null;

  const deduccionesEmp = await db
    .select()
    .from(deduccionAdicional)
    .where(eq(deduccionAdicional.detallePlanillaId, detalleId));

  const ingresosEmp = await db
    .select()
    .from(ingresoExtra)
    .where(eq(ingresoExtra.detallePlanillaId, detalleId));

  const colilla: ColillaData = {
    nombre: `${row.empleadoNombre} ${row.empleadoApellidos}`,
    cedula: row.empleadoCedula,
    email: row.empleadoEmail ?? null,
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
  };

  return {
    colilla,
    planillaId: planillaData.id,
    planillaTipo: planillaData.tipo,
    planillaEstado: planillaData.estado,
    periodo: `${planillaData.fechaInicio} a ${planillaData.fechaFin}`,
    empleadoNombre: `${row.empleadoNombre} ${row.empleadoApellidos}`,
    empleadoCedula: row.empleadoCedula,
    empleadoUserId: row.empleadoUserId ?? null,
  };
}

export async function getColillaPreview(
  detalleId: string,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const userRole = (session.user as { role?: string })?.role || "empleado";

    const ctx = await getColillaContextByDetalle(detalleId);
    if (!ctx) {
      return {
        success: false,
        message: "Detalle de planilla no encontrado",
        data: {},
      };
    }

    if (userRole === "empleado") {
      const miEmpleado = await getMiEmpleado(session.user.id);
      if (!miEmpleado || miEmpleado.id !== ctx.empleadoUserId) {
        return {
          success: false,
          message: "No tenés permisos para ver esta colilla",
          data: {},
        };
      }
    } else if (!["admin", "rrhh"].includes(userRole)) {
      return {
        success: false,
        message: "No tenés permisos para previsualizar colillas",
        data: {},
      };
    }

    const html = buildColillaPagoHtml(ctx.colilla);

    return {
      success: true,
      message: "Preview generado",
      data: {
        html,
        empleadoNombre: ctx.empleadoNombre,
        empleadoCedula: ctx.empleadoCedula,
        planillaId: ctx.planillaId,
        periodo: ctx.periodo,
        tipo: ctx.planillaTipo,
        estado: ctx.planillaEstado,
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