"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { planilla } from "@/db/schema/planilla.schema";
import { detallePlanilla } from "@/db/schema/detalle-planilla.schema";
import { deduccionAdicional } from "@/db/schema/deduccion-adicional.schema";
import { ingresoExtra } from "@/db/schema/ingreso-extra.schema";
import { tramoRenta } from "@/db/schema/tramo-renta.schema";
import { empleado } from "@/db/schema/empleado.schema";
import { user } from "@/db/schema/auth.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { puesto } from "@/db/schema/puesto.schema";
import { envioColillaLog } from "@/db/schema/envio-colilla-log.schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import * as v from "valibot";
import {
  CrearPlanillaSchema,
  AgregarDeduccionSchema,
  AgregarIngresoExtraSchema,
  ConfirmarPlanillaSchema,
  CrearTramoRentaSchema,
  ReenviarColillaSchema,
  ReenviarColillaTodasSchema,
} from "@/lib/validations/planilla";
import {
  calcularPlanillaEmpleado,
  calcularTotalesPlanilla,
} from "@/lib/planilla";
import { emailService, type EmailSendResult } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { registrarAuditoria } from "@/lib/auditoria";

export async function getPlanillas(): Promise<ActionResponse> {
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
        message: "No tenés permisos para ver planillas",
        data: {},
      };
    }

    const planillas = await db
      .select({
        planilla: planilla,
        creadoPorNombre: user.name,
        confirmadoPorNombre: sql<string | null>`confirmador.name`,
      })
      .from(planilla)
      .innerJoin(user, eq(planilla.creadoPor, user.id))
      .leftJoin(
        sql`"user" confirmador`,
        sql`confirmador.id = ${planilla.confirmadoPor}`,
      )
      .orderBy(desc(planilla.createdAt));

    return {
      success: true,
      message: "Planillas obtenidas exitosamente",
      data: { planillas },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al obtener planillas:", error);
    return { success: false, message: "Error al obtener planillas", data: {} };
  }
}

export async function getPlanillaDetalle(
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
        message: "No tenés permisos para ver esta planilla",
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

    return {
      success: true,
      message: "Detalle obtenido exitosamente",
      data: {
        planilla: planillaData,
        detalles,
        deducciones,
        ingresos,
      },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al obtener detalle:", error);
    return { success: false, message: "Error al obtener detalle", data: {} };
  }
}

export async function crearPlanilla(
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
        message: "No tenés permisos para crear planillas",
        data: {},
      };
    }

    const parsed = v.safeParse(CrearPlanillaSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const fechaInicio = new Date(data.fechaInicio + "T00:00:00");
    const fechaFin = new Date(data.fechaFin + "T00:00:00");

    if (fechaFin < fechaInicio) {
      return {
        success: false,
        message: "La fecha de fin no puede ser anterior a la de inicio",
        data: {},
      };
    }

    const overlap = await db
      .select({ id: planilla.id })
      .from(planilla)
      .where(
        and(
          eq(planilla.tipo, data.tipo),
          sql`(${planilla.fechaInicio}, ${planilla.fechaFin}) OVERLAPS (${data.fechaInicio}::date, ${data.fechaFin}::date)`,
          sql`${planilla.estado} != 'anulada'`,
        ),
      )
      .limit(1);

    if (overlap.length > 0) {
      return {
        success: false,
        message:
          "Ya existe una planilla del mismo tipo que se solapa con el período seleccionado",
        data: {},
      };
    }

    const empleadosActivos = await db
      .select({
        id: empleado.id,
        salarioBase: empleado.salarioBase,
        horasJornada: empleado.horasJornada,
        tipoJornada: empleado.tipoJornada,
      })
      .from(empleado)
      .where(eq(empleado.estado, "activo"));

    if (empleadosActivos.length === 0) {
      return {
        success: false,
        message: "No hay empleados activos para generar la planilla",
        data: {},
      };
    }

    const [newPlanilla] = await db
      .insert(planilla)
      .values({
        tipo: data.tipo,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        creadoPor: session.user.id,
        nota: data.nota,
      })
      .returning();

    const detalleValues = [];
    for (const emp of empleadosActivos) {
      const calculo = await calcularPlanillaEmpleado(
        emp,
        data.fechaInicio,
        data.fechaFin,
        data.tipo as "mensual" | "quincenal",
      );

      detalleValues.push({
        planillaId: newPlanilla.id,
        empleadoId: emp.id,
        salarioBruto: calculo.salarioBruto,
        horasOrdinarias: calculo.horasOrdinarias,
        horasExtra: calculo.horasExtra,
        montoHorasExtra: calculo.montoHorasExtra,
        desgloseDeduccionesLegales: calculo.desgloseDeduccionesLegales,
        impuestoRenta: calculo.impuestoRenta,
        totalDeduccionesLegales: calculo.totalDeduccionesLegales,
        totalDeduccionesAdicionales: "0",
        totalIngresosExtras: "0",
        salarioNeto: calculo.salarioNeto,
      });
    }

    await db.insert(detallePlanilla).values(detalleValues);

    const allCalculos = detalleValues.map((d) => ({
      salarioBruto: d.salarioBruto,
      horasOrdinarias: d.horasOrdinarias,
      horasExtra: d.horasExtra,
      montoHorasExtra: d.montoHorasExtra,
      desgloseDeduccionesLegales: d.desgloseDeduccionesLegales ?? [],
      impuestoRenta: d.impuestoRenta,
      totalDeduccionesLegales: d.totalDeduccionesLegales,
      salarioNeto: d.salarioNeto,
    }));

    const totales = calcularTotalesPlanilla(
      allCalculos,
      empleadosActivos.map(() => 0),
      empleadosActivos.map(() => 0),
    );

    await db
      .update(planilla)
      .set({
        totalEmpleados: totales.totalEmpleados,
        totalSalariosBrutos: totales.totalSalariosBrutos,
        totalHorasExtra: totales.totalHorasExtra,
        totalDeduccionesLegales: totales.totalDeduccionesLegales,
        totalSalariosNeto: totales.totalSalariosNeto,
      })
      .where(eq(planilla.id, newPlanilla.id));

    revalidatePath("/dashboard/payroll");

    logger.info(
      "PLANILLA",
      `Planilla creada: ${newPlanilla.id}, ${empleadosActivos.length} empleados, ${data.tipo}`,
    );

    await registrarAuditoria({
      tabla: "planilla",
      registroId: newPlanilla.id,
      accion: "crear",
      despues: { tipo: data.tipo, empleados: empleadosActivos.length },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: `Planilla creada con ${empleadosActivos.length} empleados`,
      data: { planillaId: newPlanilla.id },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al crear planilla:", error);
    return { success: false, message: "Error al crear planilla", data: {} };
  }
}

export async function agregarDeduccionAdicional(
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
        message: "No tenés permisos para agregar deducciones",
        data: {},
      };
    }

    const parsed = v.safeParse(AgregarDeduccionSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [detalle] = await db
      .select()
      .from(detallePlanilla)
      .where(eq(detallePlanilla.id, data.detallePlanillaId))
      .limit(1);

    if (!detalle) {
      return {
        success: false,
        message: "Detalle de planilla no encontrado",
        data: {},
      };
    }

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, detalle.planillaId))
      .limit(1);

    if (planillaData.estado !== "borrador") {
      return {
        success: false,
        message: "Solo se puede editar una planilla en estado borrador",
        data: {},
      };
    }

    if (detalle.empleadoId !== data.empleadoId) {
      return {
        success: false,
        message:
          "El empleado de la deducción no coincide con el del detalle de planilla.",
        data: {},
      };
    }

    await db.insert(deduccionAdicional).values({
      detallePlanillaId: data.detallePlanillaId,
      empleadoId: data.empleadoId,
      concepto: data.concepto,
      monto: data.monto,
      tipo: data.tipo,
    });

    await recalcularDetalle(data.detallePlanillaId);

    revalidatePath("/dashboard/payroll");

    return {
      success: true,
      message: "Deducción agregada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al agregar deducción:", error);
    return { success: false, message: "Error al agregar deducción", data: {} };
  }
}

export async function eliminarDeduccionAdicional(
  deduccionId: string,
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
        message: "No tenés permisos para eliminar deducciones",
        data: {},
      };
    }

    const [ded] = await db
      .select()
      .from(deduccionAdicional)
      .where(eq(deduccionAdicional.id, deduccionId))
      .limit(1);

    if (!ded) {
      return {
        success: false,
        message: "Deducción no encontrada",
        data: {},
      };
    }

    const [planillaDed] = await db
      .select({ estado: planilla.estado })
      .from(planilla)
      .innerJoin(detallePlanilla, eq(detallePlanilla.planillaId, planilla.id))
      .where(eq(detallePlanilla.id, ded.detallePlanillaId))
      .limit(1);

    if (planillaDed && planillaDed.estado !== "borrador") {
      return {
        success: false,
        message:
          "Solo se puede eliminar una deducción de una planilla en estado borrador.",
        data: {},
      };
    }

    await db.delete(deduccionAdicional).where(eq(deduccionAdicional.id, deduccionId));
    await recalcularDetalle(ded.detallePlanillaId);

    revalidatePath("/dashboard/payroll");

    return {
      success: true,
      message: "Deducción eliminada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al eliminar deducción:", error);
    return { success: false, message: "Error al eliminar deducción", data: {} };
  }
}

export async function agregarIngresoExtra(
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
        message: "No tenés permisos para agregar ingresos extra",
        data: {},
      };
    }

    const parsed = v.safeParse(AgregarIngresoExtraSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [detalle] = await db
      .select()
      .from(detallePlanilla)
      .where(eq(detallePlanilla.id, data.detallePlanillaId))
      .limit(1);

    if (!detalle) {
      return {
        success: false,
        message: "Detalle de planilla no encontrado",
        data: {},
      };
    }

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, detalle.planillaId))
      .limit(1);

    if (planillaData.estado !== "borrador") {
      return {
        success: false,
        message: "Solo se puede editar una planilla en estado borrador",
        data: {},
      };
    }

    if (detalle.empleadoId !== data.empleadoId) {
      return {
        success: false,
        message:
          "El empleado del ingreso extra no coincide con el del detalle de planilla.",
        data: {},
      };
    }

    await db.insert(ingresoExtra).values({
      detallePlanillaId: data.detallePlanillaId,
      empleadoId: data.empleadoId,
      concepto: data.concepto,
      monto: data.monto,
      tipo: data.tipo,
    });

    await recalcularDetalle(data.detallePlanillaId);

    revalidatePath("/dashboard/payroll");

    return {
      success: true,
      message: "Ingreso extra agregado exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al agregar ingreso extra:", error);
    return { success: false, message: "Error al agregar ingreso extra", data: {} };
  }
}

export async function eliminarIngresoExtra(
  ingresoId: string,
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
        message: "No tenés permisos para eliminar ingresos extra",
        data: {},
      };
    }

    const [ing] = await db
      .select()
      .from(ingresoExtra)
      .where(eq(ingresoExtra.id, ingresoId))
      .limit(1);

    if (!ing) {
      return {
        success: false,
        message: "Ingreso extra no encontrado",
        data: {},
      };
    }

    const [planillaIng] = await db
      .select({ estado: planilla.estado })
      .from(planilla)
      .innerJoin(detallePlanilla, eq(detallePlanilla.planillaId, planilla.id))
      .where(eq(detallePlanilla.id, ing.detallePlanillaId))
      .limit(1);

    if (planillaIng && planillaIng.estado !== "borrador") {
      return {
        success: false,
        message:
          "Solo se puede eliminar un ingreso extra de una planilla en estado borrador.",
        data: {},
      };
    }

    await db.delete(ingresoExtra).where(eq(ingresoExtra.id, ingresoId));
    await recalcularDetalle(ing.detallePlanillaId);

    revalidatePath("/dashboard/payroll");

    return {
      success: true,
      message: "Ingreso extra eliminado exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al eliminar ingreso extra:", error);
    return { success: false, message: "Error al eliminar ingreso extra", data: {} };
  }
}

async function recalcularDetalle(detalleId: string): Promise<void> {
  const [detalle] = await db
    .select()
    .from(detallePlanilla)
    .where(eq(detallePlanilla.id, detalleId))
    .limit(1);

  if (!detalle) return;

  const deduccionesEmp = await db
    .select()
    .from(deduccionAdicional)
    .where(eq(deduccionAdicional.detallePlanillaId, detalleId));

  const ingresosEmp = await db
    .select()
    .from(ingresoExtra)
    .where(eq(ingresoExtra.detallePlanillaId, detalleId));

  const totalDedAdic = deduccionesEmp.reduce(
    (sum, d) => sum + parseFloat(d.monto),
    0,
  );
  const totalIngExt = ingresosEmp.reduce(
    (sum, i) => sum + parseFloat(i.monto),
    0,
  );

  const bruto = parseFloat(detalle.salarioBruto);
  const montoHE = parseFloat(detalle.montoHorasExtra);
  const totalIngresos = bruto + montoHE + totalIngExt;
  const dedLegales = parseFloat(detalle.totalDeduccionesLegales);
  const neto = Math.round((totalIngresos - dedLegales - totalDedAdic) * 100) / 100;

  await db
    .update(detallePlanilla)
    .set({
      totalDeduccionesAdicionales: totalDedAdic.toFixed(2),
      totalIngresosExtras: totalIngExt.toFixed(2),
      salarioNeto: neto.toFixed(2),
    })
    .where(eq(detallePlanilla.id, detalleId));

  await recalcularTotalesPlanilla(detalle.planillaId);
}

async function recalcularTotalesPlanilla(planillaId: string): Promise<void> {
  const detalles = await db
    .select()
    .from(detallePlanilla)
    .where(eq(detallePlanilla.planillaId, planillaId));

  let totalBrutos = 0;
  let totalHE = 0;
  let totalDedLegales = 0;
  let totalDedAdic = 0;
  let totalIngExt = 0;
  let totalNeto = 0;
  let totalBonos = 0;
  let totalComisiones = 0;

  const ingresos = await db
    .select()
    .from(ingresoExtra)
    .where(inArray(ingresoExtra.detallePlanillaId, detalles.map((d) => d.id)));

  for (const d of detalles) {
    totalBrutos += parseFloat(d.salarioBruto);
    totalHE += parseFloat(d.montoHorasExtra);
    totalDedLegales += parseFloat(d.totalDeduccionesLegales);
    totalDedAdic += parseFloat(d.totalDeduccionesAdicionales);
    totalIngExt += parseFloat(d.totalIngresosExtras);
    totalNeto += parseFloat(d.salarioNeto);
  }

  for (const ing of ingresos) {
    if (ing.tipo === "bono") totalBonos += parseFloat(ing.monto);
    if (ing.tipo === "comision") totalComisiones += parseFloat(ing.monto);
  }

  await db
    .update(planilla)
    .set({
      totalEmpleados: detalles.length,
      totalSalariosBrutos: totalBrutos.toFixed(2),
      totalHorasExtra: totalHE.toFixed(2),
      totalBonos: totalBonos.toFixed(2),
      totalComisiones: totalComisiones.toFixed(2),
      totalDeduccionesLegales: totalDedLegales.toFixed(2),
      totalDeduccionesAdicionales: totalDedAdic.toFixed(2),
      totalSalariosNeto: totalNeto.toFixed(2),
    })
    .where(eq(planilla.id, planillaId));
}

export async function confirmarPlanilla(
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
        message: "No tenés permisos para confirmar planillas",
        data: {},
      };
    }

    const parsed = v.safeParse(ConfirmarPlanillaSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, data.planillaId))
      .limit(1);

    if (!planillaData) {
      return { success: false, message: "Planilla no encontrada", data: {} };
    }

    if (planillaData.estado !== "borrador") {
      return {
        success: false,
        message: "Solo se puede confirmar una planilla en estado borrador",
        data: {},
      };
    }

    await db
      .update(planilla)
      .set({
        estado: "procesada",
        fechaPago: data.fechaPago,
        confirmadoPor: session.user.id,
        confirmadoEn: new Date(),
      })
      .where(eq(planilla.id, data.planillaId));

    enviarColillasEnBackground(data.planillaId, session.user.id);

    revalidatePath("/dashboard/payroll");

    logger.info("PLANILLA", `Planilla ${data.planillaId} confirmada por ${session.user.id}`);

    await registrarAuditoria({
      tabla: "planilla",
      registroId: data.planillaId,
      accion: "editar",
      despues: { estado: "procesada" },
      antes: { estado: planillaData.estado },
      realizadoPor: session.user.id,
    });

    return {
      success: true,
      message: "Planilla confirmada exitosamente. Las colillas se están enviando.",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al confirmar planilla:", error);
    return { success: false, message: "Error al confirmar planilla", data: {} };
  }
}

async function enviarColillasEnBackground(
  planillaId: string,
  realizadoPor: string,
): Promise<void> {
  try {
    const detalles = await db
      .select({
        detalle: detallePlanilla,
        empleadoNombre: empleado.nombre,
        empleadoApellidos: empleado.apellidos,
        empleadoCedula: empleado.cedula,
        userEmail: user.email,
        sucursalNombre: sucursal.nombre,
        puestoNombre: puesto.nombre,
      })
      .from(detallePlanilla)
      .innerJoin(empleado, eq(detallePlanilla.empleadoId, empleado.id))
      .innerJoin(user, eq(empleado.userId, user.id))
      .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
      .leftJoin(puesto, eq(empleado.puestoId, puesto.id))
      .where(eq(detallePlanilla.planillaId, planillaId));

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, planillaId))
      .limit(1);

    if (!planillaData) {
      logger.error(
        "PLANILLA",
        `enviarColillasEnBackground: planilla ${planillaId} no encontrada`,
      );
      return;
    }

    let exitosos = 0;
    let fallidos = 0;
    let sinEmail = 0;

    for (const d of detalles) {
      if (!d.userEmail) {
        sinEmail++;
        logger.warn(
          "PLANILLA",
          `Empleado ${d.empleadoNombre} ${d.empleadoApellidos} (${d.empleadoCedula}) sin email registrado. Colilla omitida.`,
          { planillaId, detallePlanillaId: d.detalle.id },
        );
        continue;
      }

      const result = await enviarColillaPorDetalle({
        detalleId: d.detalle.id,
        planillaData,
        tipoEnvio: "inicial",
        realizadoPor,
      });

      if (result.success) exitosos++;
      else fallidos++;
    }

    logger.info(
      "PLANILLA",
      `Envío de colillas finalizado para planilla ${planillaId}. Exitosos: ${exitosos}, Fallidos: ${fallidos}, Sin email: ${sinEmail}`,
    );
  } catch (error) {
    logger.error("PLANILLA", "Error enviando colillas:", error);
  }
}

type ResultadoEnvioColilla = {
  success: boolean;
  message: string;
  detalleId?: string;
};

async function enviarColillaPorDetalle(params: {
  detalleId: string;
  planillaData: typeof planilla.$inferSelect;
  tipoEnvio: "inicial" | "reenvio";
  realizadoPor: string;
}): Promise<ResultadoEnvioColilla> {
  const { detalleId, planillaData, tipoEnvio, realizadoPor } = params;

  const [row] = await db
    .select({
      detalle: detallePlanilla,
      empleadoNombre: empleado.nombre,
      empleadoApellidos: empleado.apellidos,
      empleadoCedula: empleado.cedula,
      userEmail: user.email,
      sucursalNombre: sucursal.nombre,
      puestoNombre: puesto.nombre,
    })
    .from(detallePlanilla)
    .innerJoin(empleado, eq(detallePlanilla.empleadoId, empleado.id))
    .innerJoin(user, eq(empleado.userId, user.id))
    .leftJoin(sucursal, eq(empleado.sucursalId, sucursal.id))
    .leftJoin(puesto, eq(empleado.puestoId, puesto.id))
    .where(eq(detallePlanilla.id, detalleId))
    .limit(1);

  if (!row) {
    const mensaje = `Detalle de planilla ${detalleId} no encontrado`;
    logger.error("PLANILLA", mensaje);
    return { success: false, message: mensaje };
  }

  if (!row.userEmail) {
    const mensaje = `Empleado ${row.empleadoNombre} ${row.empleadoApellidos} (${row.empleadoCedula}) no tiene email registrado`;
    logger.warn("PLANILLA", mensaje, {
      planillaId: planillaData.id,
      detallePlanillaId: detalleId,
    });
    return { success: false, message: mensaje };
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

  const subject = `Colilla de pago — ${planillaData.tipo === "mensual" ? "Planilla mensual" : "Planilla quincenal"} — Período: ${planillaData.fechaInicio} a ${planillaData.fechaFin}`;

  const result: EmailSendResult = await emailService.sendEmailWithResult({
    to: row.userEmail,
    subject,
    html,
  });

  try {
    await db.insert(envioColillaLog).values({
      planillaId: planillaData.id,
      detallePlanillaId: detalleId,
      empleadoId: row.detalle.empleadoId,
      emailDestino: row.userEmail,
      exito: result.success,
      mensajeError: result.error ?? null,
      mensajeId: result.messageId ?? null,
      tipoEnvio,
      realizadoPor,
    });
  } catch (logError) {
    logger.error(
      "PLANILLA",
      "No se pudo registrar el log de envío de colilla:",
      logError,
    );
  }

  if (result.success) {
    await db
      .update(detallePlanilla)
      .set({ colillaEnviada: "1" })
      .where(eq(detallePlanilla.id, detalleId));

    return {
      success: true,
      message: `Colilla enviada a ${row.userEmail}`,
      detalleId,
    };
  }

  logger.error(
    "PLANILLA",
    `Falló envío de colilla a ${row.userEmail} (${row.empleadoNombre} ${row.empleadoApellidos}, cédula ${row.empleadoCedula}). planilla=${planillaData.id}, detalle=${detalleId}. Error: ${result.error ?? "(sin mensaje)"}`,
    {
      planillaId: planillaData.id,
      detallePlanillaId: detalleId,
      empleadoId: row.detalle.empleadoId,
      emailDestino: row.userEmail,
      errorCode: result.code,
      tipoEnvio,
    },
  );

  return {
    success: false,
    message: `No se pudo enviar a ${row.userEmail}: ${result.error ?? "error desconocido"}`,
    detalleId,
  };
}

function buildColillaPagoHtml(data: {
  nombre: string;
  cedula: string;
  sucursal: string | null;
  puesto: string | null;
  periodoInicio: string;
  periodoFin: string;
  fechaPago: string | null;
  tipo: string;
  salarioBruto: string;
  horasExtra: string;
  montoHorasExtra: string;
  totalIngresosExtras: string;
  ingresosExtras: { concepto: string; monto: string }[];
  desgloseDeduccionesLegales: {
    nombre: string;
    clave: string;
    tipo: "porcentaje" | "monto_fijo";
    base: "total_ingresos" | "gravable_renta";
    valor: string;
    monto: string;
  }[];
  impuestoRenta: string;
  totalDeduccionesLegales: string;
  totalDeduccionesAdicionales: string;
  deduccionesAdicionales: { concepto: string; monto: string }[];
  salarioNeto: string;
}): string {
  const fmt = (n: string) =>
    parseFloat(n).toLocaleString("es-CR", { minimumFractionDigits: 2 });

  const ingresosExtrasRows = data.ingresosExtras
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px;color:#78716c;">${escapeHtml(i.concepto)}</td><td style="padding:4px 8px;text-align:right;">¢${fmt(i.monto)}</td></tr>`,
    )
    .join("");

  const deduccionesLegalesRows = data.desgloseDeduccionesLegales
    .map((d) => {
      const tasa =
        d.tipo === "porcentaje"
          ? ` (${(parseFloat(d.valor) * 100).toFixed(4).replace(/\.?0+$/, "")}%)`
          : "";
      const base =
        d.base === "gravable_renta" ? " (gravable)" : "";
      return `<tr><td style="padding:4px 12px;">${escapeHtml(d.nombre)}${tasa}${base}</td><td style="padding:4px 12px;text-align:right;">¢${fmt(d.monto)}</td></tr>`;
    })
    .join("");

  const deduccionesAdicionalesRows = data.deduccionesAdicionales
    .map(
      (d) =>
        `<tr><td style="padding:4px 8px;color:#78716c;">${escapeHtml(d.concepto)}</td><td style="padding:4px 8px;text-align:right;">¢${fmt(d.monto)}</td></tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Colilla de Pago</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr><td style="background-color:#1c1917;padding:24px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">Colilla de Pago — Jivis</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
<h2 style="margin:0 0 16px;color:#1c1917;font-size:18px;">${escapeHtml(data.nombre)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="padding:4px 0;color:#78716c;font-size:13px;">Cédula: <strong style="color:#1c1917;">${escapeHtml(data.cedula)}</strong></td>
<td style="padding:4px 0;color:#78716c;font-size:13px;">Puesto: <strong style="color:#1c1917;">${escapeHtml(data.puesto || "—")}</strong></td>
</tr><tr>
<td style="padding:4px 0;color:#78716c;font-size:13px;">Sucursal: <strong style="color:#1c1917;">${escapeHtml(data.sucursal || "—")}</strong></td>
<td style="padding:4px 0;color:#78716c;font-size:13px;">Período: <strong style="color:#1c1917;">${data.periodoInicio} a ${data.periodoFin}</strong></td>
</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin-bottom:16px;">
<tr style="background-color:#f5f5f4;"><td colspan="2" style="padding:8px 12px;font-weight:600;color:#1c1917;font-size:14px;">Ingresos</td></tr>
<tr><td style="padding:4px 12px;">Salario bruto</td><td style="padding:4px 12px;text-align:right;">¢${fmt(data.salarioBruto)}</td></tr>
<tr><td style="padding:4px 12px;">Horas extra (${data.horasExtra}h)</td><td style="padding:4px 12px;text-align:right;">¢${fmt(data.montoHorasExtra)}</td></tr>
${ingresosExtrasRows}
<tr style="border-top:1px solid #e7e5e4;"><td style="padding:8px 12px;font-weight:600;">Total ingresos</td><td style="padding:8px 12px;text-align:right;font-weight:600;">¢${fmt((parseFloat(data.salarioBruto) + parseFloat(data.montoHorasExtra) + parseFloat(data.totalIngresosExtras)).toFixed(2))}</td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin-bottom:16px;">
<tr style="background-color:#f5f5f4;"><td colspan="2" style="padding:8px 12px;font-weight:600;color:#1c1917;font-size:14px;">Deducciones Legales</td></tr>
${deduccionesLegalesRows || `<tr><td colspan="2" style="padding:8px 12px;color:#a8a29e;">Sin deducciones legales aplicables</td></tr>`}
<tr><td style="padding:4px 12px;">Impuesto sobre la Renta</td><td style="padding:4px 12px;text-align:right;">¢${fmt(data.impuestoRenta)}</td></tr>
<tr style="border-top:1px solid #e7e5e4;"><td style="padding:8px 12px;font-weight:600;">Total deducciones legales</td><td style="padding:8px 12px;text-align:right;font-weight:600;">¢${fmt(data.totalDeduccionesLegales)}</td></tr>
</table>

${deduccionesAdicionalesRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin-bottom:16px;">
<tr style="background-color:#f5f5f4;"><td colspan="2" style="padding:8px 12px;font-weight:600;color:#1c1917;font-size:14px;">Deducciones Adicionales</td></tr>
${deduccionesAdicionalesRows}
<tr style="border-top:1px solid #e7e5e4;"><td style="padding:8px 12px;font-weight:600;">Total deducciones adicionales</td><td style="padding:8px 12px;text-align:right;font-weight:600;">¢${fmt(data.totalDeduccionesAdicionales)}</td></tr>
</table>` : ""}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1c1917;border-radius:6px;margin-top:24px;">
<tr><td style="padding:16px 20px;color:#fff;font-size:18px;font-weight:700;">Salario Neto</td><td style="padding:16px 20px;text-align:right;color:#fff;font-size:18px;font-weight:700;">¢${fmt(data.salarioNeto)}</td></tr>
</table>

${data.fechaPago ? `<p style="margin:16px 0 0;color:#78716c;font-size:13px;">Fecha de pago: ${data.fechaPago}</p>` : ""}
</td></tr>
<tr><td style="background-color:#f5f5f4;padding:16px 40px;text-align:center;">
<p style="margin:0;color:#a8a29e;font-size:12px;">Distribuidora Jivis S.A. — Colilla de pago generada automáticamente</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function reenviarColillaEmpleado(
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
        message: "No tenés permisos para reenviar colillas",
        data: {},
      };
    }

    const parsed = v.safeParse(ReenviarColillaSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [detalle] = await db
      .select()
      .from(detallePlanilla)
      .where(eq(detallePlanilla.id, data.detallePlanillaId))
      .limit(1);

    if (!detalle) {
      return {
        success: false,
        message: "Detalle de planilla no encontrado",
        data: {},
      };
    }

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, detalle.planillaId))
      .limit(1);

    if (!planillaData) {
      return {
        success: false,
        message: "Planilla no encontrada",
        data: {},
      };
    }

    if (planillaData.estado !== "procesada") {
      return {
        success: false,
        message:
          "Solo se pueden reenviar colillas de planillas en estado procesada",
        data: {},
      };
    }

    const resultado = await enviarColillaPorDetalle({
      detalleId: data.detallePlanillaId,
      planillaData,
      tipoEnvio: "reenvio",
      realizadoPor: session.user.id,
    });

    await registrarAuditoria({
      tabla: "detalle_planilla",
      registroId: data.detallePlanillaId,
      accion: "editar",
      antes: { colillaEnviada: detalle.colillaEnviada },
      despues: {
        colillaEnviada: resultado.success ? "1" : detalle.colillaEnviada,
        tipoEnvio: "reenvio",
        exito: resultado.success,
      },
      realizadoPor: session.user.id,
    });

    if (!resultado.success) {
      return {
        success: false,
        message: resultado.message,
        data: { detallePlanillaId: data.detallePlanillaId },
      };
    }

    return {
      success: true,
      message: resultado.message,
      data: { detallePlanillaId: data.detallePlanillaId },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al reenviar colilla:", error);
    return {
      success: false,
      message: "Error al reenviar colilla",
      data: {},
    };
  }
}

export async function reenviarColillaTodas(
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
        message: "No tenés permisos para reenviar colillas",
        data: {},
      };
    }

    const parsed = v.safeParse(ReenviarColillaTodasSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    const [planillaData] = await db
      .select()
      .from(planilla)
      .where(eq(planilla.id, data.planillaId))
      .limit(1);

    if (!planillaData) {
      return {
        success: false,
        message: "Planilla no encontrada",
        data: {},
      };
    }

    if (planillaData.estado !== "procesada") {
      return {
        success: false,
        message:
          "Solo se pueden reenviar colillas de planillas en estado procesada",
        data: {},
      };
    }

    const detalles = await db
      .select({ id: detallePlanilla.id })
      .from(detallePlanilla)
      .where(eq(detallePlanilla.planillaId, data.planillaId))
      .orderBy(detallePlanilla.id);

    if (detalles.length === 0) {
      return {
        success: false,
        message: "La planilla no tiene detalles para reenviar",
        data: {},
      };
    }

    logger.info(
      "PLANILLA",
      `Inicio de reenvío masivo: planilla=${data.planillaId}, ${detalles.length} empleados, solicitado por ${session.user.id}`,
    );

    let exitosos = 0;
    let fallidos = 0;
    let sinEmail = 0;
    const erroresDetallados: string[] = [];

    for (const d of detalles) {
      const resultado = await enviarColillaPorDetalle({
        detalleId: d.id,
        planillaData,
        tipoEnvio: "reenvio",
        realizadoPor: session.user.id,
      });

      if (resultado.success) {
        exitosos++;
      } else if (resultado.message.includes("no tiene email")) {
        sinEmail++;
      } else {
        fallidos++;
        erroresDetallados.push(resultado.message);
      }
    }

    await registrarAuditoria({
      tabla: "planilla",
      registroId: data.planillaId,
      accion: "editar",
      despues: {
        tipoEnvio: "reenvio_masivo",
        exitosos,
        fallidos,
        sinEmail,
      },
      realizadoPor: session.user.id,
    });

    logger.info(
      "PLANILLA",
      `Reenvío masivo finalizado: planilla=${data.planillaId}. Exitosos=${exitosos}, Fallidos=${fallidos}, Sin email=${sinEmail}`,
    );

    if (fallidos === 0 && sinEmail === 0) {
      return {
        success: true,
        message: `Reenvío completado: ${exitosos} correo(s) enviado(s) correctamente.`,
        data: { exitosos, fallidos, sinEmail },
      };
    }

    const primerError =
      erroresDetallados.length > 0
        ? ` Primer error: ${erroresDetallados[0]}`
        : "";

    return {
      success: false,
      message: `Reenvío parcial: ${exitosos} enviados, ${fallidos} fallaron, ${sinEmail} sin email.${primerError}`,
      data: { exitosos, fallidos, sinEmail },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error en reenvío masivo de colillas:", error);
    return {
      success: false,
      message: "Error al reenviar colillas",
      data: {},
    };
  }
}

export async function anularPlanilla(
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
        message: "No tenés permisos para anular planillas",
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

    if (planillaData.estado === "anulada") {
      return {
        success: false,
        message: "La planilla ya está anulada",
        data: {},
      };
    }

    await db
      .update(planilla)
      .set({ estado: "anulada" })
      .where(eq(planilla.id, planillaId));

    revalidatePath("/dashboard/payroll");

    logger.info("PLANILLA", `Planilla ${planillaId} anulada por ${session.user.id}`);

    return {
      success: true,
      message: "Planilla anulada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al anular planilla:", error);
    return { success: false, message: "Error al anular planilla", data: {} };
  }
}

export async function getTramosRenta(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "No autorizado", data: {} };
    }

    const tramos = await db
      .select()
      .from(tramoRenta)
      .orderBy(tramoRenta.limiteInferior);

    return {
      success: true,
      message: "Tramos obtenidos exitosamente",
      data: { tramos },
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al obtener tramos:", error);
    return { success: false, message: "Error al obtener tramos", data: {} };
  }
}

export async function crearTramoRenta(
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
        message: "No tenés permisos para crear tramos de renta",
        data: {},
      };
    }

    const parsed = v.safeParse(CrearTramoRentaSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const data = parsed.output;

    await db.insert(tramoRenta).values({
      limiteInferior: data.limiteInferior,
      limiteSuperior: data.limiteSuperior,
      porcentaje: data.porcentaje,
      montoExcedente: data.montoExcedente,
      descripcion: data.descripcion,
    });

    revalidatePath("/dashboard/payroll");

    return {
      success: true,
      message: "Tramo de renta creado exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al crear tramo:", error);
    return { success: false, message: "Error al crear tramo", data: {} };
  }
}

export async function eliminarTramoRenta(
  tramoId: string,
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
        message: "No tenés permisos para eliminar tramos",
        data: {},
      };
    }

    await db.delete(tramoRenta).where(eq(tramoRenta.id, tramoId));

    revalidatePath("/dashboard/payroll");

    return {
      success: true,
      message: "Tramo eliminado exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("PLANILLA", "Error al eliminar tramo:", error);
    return { success: false, message: "Error al eliminar tramo", data: {} };
  }
}
