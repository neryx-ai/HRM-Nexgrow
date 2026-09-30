"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { detallePlanilla } from "@/db/schema/detalle-planilla.schema";
import { planilla } from "@/db/schema/planilla.schema";
import { eq, and, desc } from "drizzle-orm";
import { getMiEmpleado } from "@/lib/empleado";
import { logger } from "@/lib/logger";

export interface MiColillaResumen {
  detalleId: string;
  planillaId: string;
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string | null;
  salarioNeto: string;
  salarioBruto: string;
  totalDeduccionesLegales: string;
  totalDeduccionesAdicionales: string;
  colillaEnviada: string;
}

export async function getMisColillas(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const miEmpleado = await getMiEmpleado(session.user.id);
    if (!miEmpleado) {
      return {
        success: false,
        message:
          "No tenés un perfil de empleado asociado. Contactá a RRHH.",
        data: {},
      };
    }

    const rows = await db
      .select({
        detalleId: detallePlanilla.id,
        planillaId: planilla.id,
        tipo: planilla.tipo,
        estado: planilla.estado,
        fechaInicio: planilla.fechaInicio,
        fechaFin: planilla.fechaFin,
        fechaPago: planilla.fechaPago,
        salarioNeto: detallePlanilla.salarioNeto,
        salarioBruto: detallePlanilla.salarioBruto,
        totalDeduccionesLegales: detallePlanilla.totalDeduccionesLegales,
        totalDeduccionesAdicionales: detallePlanilla.totalDeduccionesAdicionales,
        colillaEnviada: detallePlanilla.colillaEnviada,
      })
      .from(detallePlanilla)
      .innerJoin(planilla, eq(detallePlanilla.planillaId, planilla.id))
      .where(
        and(
          eq(detallePlanilla.empleadoId, miEmpleado.id),
          eq(planilla.estado, "procesada"),
        ),
      )
      .orderBy(desc(planilla.fechaFin));

    return {
      success: true,
      message: "Colillas obtenidas",
      data: {
        colillas: rows,
        empleado: {
          id: miEmpleado.id,
          nombre: miEmpleado.nombre,
          apellidos: miEmpleado.apellidos,
          cedula: miEmpleado.cedula,
        },
      },
    };
  } catch (error) {
    logger.error("COLILLA", "Error al obtener mis colillas:", error);
    return {
      success: false,
      message: "Error al obtener colillas",
      data: {},
    };
  }
}