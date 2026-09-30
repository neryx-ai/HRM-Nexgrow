"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { getColillaContextByDetalle } from "./colilla-preview.actions";
import { getMiEmpleado } from "@/lib/empleado";
import { buildColillaPdf } from "@/lib/colilla-pdf";
import { logger } from "@/lib/logger";

async function buildColillaPdfBase64(
  colilla: Parameters<typeof buildColillaPdf>[1],
): Promise<string> {
  const jsPDF = (await import("jspdf")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  buildColillaPdf(doc, colilla);
  const arrayBuffer = doc.output("arraybuffer");
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function exportarColillaPdf(
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
    if (!["admin", "rrhh"].includes(userRole)) {
      return {
        success: false,
        message: "No tenés permisos para exportar colillas",
        data: {},
      };
    }

    const ctx = await getColillaContextByDetalle(detalleId);
    if (!ctx) {
      return {
        success: false,
        message: "Detalle de planilla no encontrado",
        data: {},
      };
    }

    const base64 = await buildColillaPdfBase64(ctx.colilla);

    const safeName = `${ctx.empleadoNombre.replace(/\s+/g, "_")}_${ctx.empleadoCedula}`;
    return {
      success: true,
      message: "PDF generado",
      data: {
        base64,
        filename: `colilla_${safeName}_${ctx.periodo.replace(/\s+a\s+/, "_")}.pdf`,
        contentType: "application/pdf",
      },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al exportar PDF de colilla:", error);
    return {
      success: false,
      message: "Error al exportar PDF de colilla",
      data: {},
    };
  }
}

export async function exportarMiColillaPdf(
  detalleId: string,
): Promise<ActionResponse> {
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
        message: "No tenés un perfil de empleado asociado",
        data: {},
      };
    }

    const ctx = await getColillaContextByDetalle(detalleId);
    if (!ctx) {
      return {
        success: false,
        message: "Detalle de planilla no encontrado",
        data: {},
      };
    }

    if (ctx.colilla.cedula !== miEmpleado.cedula) {
      return {
        success: false,
        message: "No podés descargar colillas de otros empleados",
        data: {},
      };
    }

    const base64 = await buildColillaPdfBase64(ctx.colilla);

    const safeName = `${ctx.empleadoNombre.replace(/\s+/g, "_")}_${ctx.empleadoCedula}`;
    return {
      success: true,
      message: "PDF generado",
      data: {
        base64,
        filename: `colilla_${safeName}_${ctx.periodo.replace(/\s+a\s+/, "_")}.pdf`,
        contentType: "application/pdf",
      },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al exportar PDF de mi colilla:", error);
    return {
      success: false,
      message: "Error al exportar PDF",
      data: {},
    };
  }
}