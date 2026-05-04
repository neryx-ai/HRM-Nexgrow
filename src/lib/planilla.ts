import { db } from "@/db/drizzle";
import { tramoRenta } from "@/db/schema/tramo-renta.schema";
import { configuracionDeduccion } from "@/db/schema/configuracion-deduccion.schema";
import { resumenAsistenciaDiaria } from "@/db/schema/resumen-asistencia-diaria.schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger } from "@/lib/logger";

let cachedDeducciones: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

export async function getDeduccionesConfig(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedDeducciones && now - cacheTimestamp < CACHE_TTL) {
    return cachedDeducciones;
  }

  const rows = await db.select({ clave: configuracionDeduccion.clave, valor: configuracionDeduccion.valor }).from(configuracionDeduccion).where(eq(configuracionDeduccion.activo, true));

  const requiredKeys = ["ccssEmpleado", "insEmpleado", "bancoPopular", "factorHorasExtra"];
  const result: Record<string, number> = {};

  for (const key of requiredKeys) {
    const row = rows.find((r) => r.clave === key);
    if (!row) {
      throw new Error(`Configuración faltante: "${key}" no encontrada en configuracion_deduccion. Ejecutá "pnpm seed" o agregala manualmente en Configuración > Deducciones.`);
    }
    const parsed = parseFloat(row.valor);
    if (isNaN(parsed)) {
      throw new Error(`Configuración inválida: "${key}" tiene valor "${row.valor}" que no es numérico. Corregilo en Configuración > Deducciones.`);
    }
    result[key] = parsed;
  }

  cachedDeducciones = result;
  cacheTimestamp = now;
  return result;
}

export function clearDeduccionesCache(): void {
  cachedDeducciones = null;
  cacheTimestamp = 0;
}

interface DatosEmpleado {
  id: string;
  salarioBase: string;
  horasJornada: number;
  tipoJornada: string;
}

interface TramoRentaActivo {
  limiteInferior: string;
  limiteSuperior: string | null;
  porcentaje: string;
  montoExcedente: string;
}

export interface ResultadoCalculo {
  salarioBruto: string;
  horasOrdinarias: string;
  horasExtra: string;
  montoHorasExtra: string;
  ccssEmpleado: string;
  insEmpleado: string;
  impuestoRenta: string;
  bancoPopular: string;
  totalDeduccionesLegales: string;
  salarioNeto: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatCurrency(n: number): string {
  return round2(n).toFixed(2);
}

export async function getTramosRentaActivos(): Promise<TramoRentaActivo[]> {
  const tramos = await db
    .select()
    .from(tramoRenta)
    .where(eq(tramoRenta.activo, true))
    .orderBy(tramoRenta.limiteInferior);

  return tramos.map((t) => ({
    limiteInferior: t.limiteInferior,
    limiteSuperior: t.limiteSuperior,
    porcentaje: t.porcentaje,
    montoExcedente: t.montoExcedente,
  }));
}

function calcularImpuestoRenta(
  salarioGravable: number,
  tramos: TramoRentaActivo[],
): number {
  for (const tramo of tramos) {
    const inferior = parseFloat(tramo.limiteInferior);
    const superior = tramo.limiteSuperior
      ? parseFloat(tramo.limiteSuperior)
      : Infinity;
    const porcentaje = parseFloat(tramo.porcentaje) / 100;
    const excedente = parseFloat(tramo.montoExcedente);

    if (salarioGravable >= inferior && salarioGravable <= superior) {
      return round2(excedente + (salarioGravable - inferior) * porcentaje);
    }
  }
  return 0;
}

async function getHorasPeriodo(
  empleadoId: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<{ horasOrdinarias: number; horasExtra: number }> {
  const resumenes = await db
    .select({
      horasOrdinarias: resumenAsistenciaDiaria.horasOrdinarias,
      horasExtra: resumenAsistenciaDiaria.horasExtra,
      ausente: resumenAsistenciaDiaria.ausente,
    })
    .from(resumenAsistenciaDiaria)
    .where(
      and(
        eq(resumenAsistenciaDiaria.empleadoId, empleadoId),
        gte(resumenAsistenciaDiaria.fecha, fechaInicio),
        lte(resumenAsistenciaDiaria.fecha, fechaFin),
      ),
    );

  let totalOrdinarias = 0;
  let totalExtra = 0;

  for (const r of resumenes) {
    totalOrdinarias += parseFloat(r.horasOrdinarias || "0");
    totalExtra += parseFloat(r.horasExtra || "0");
  }

  return {
    horasOrdinarias: round2(totalOrdinarias),
    horasExtra: round2(totalExtra),
  };
}

export async function calcularPlanillaEmpleado(
  empleado: DatosEmpleado,
  fechaInicio: string,
  fechaFin: string,
  tipo: "mensual" | "quincenal",
  ingresosExtras: number = 0,
  deduccionesAdicionales: number = 0,
): Promise<ResultadoCalculo> {
  const deducciones = await getDeduccionesConfig();
  const salarioBase = parseFloat(empleado.salarioBase);
  const { factorHorasExtra, ccssEmpleado: ccssTasa, insEmpleado: insTasa, bancoPopular: bpTasa } = deducciones;

  let salarioBruto: number;
  if (tipo === "quincenal") {
    salarioBruto = round2(salarioBase / 2);
  } else {
    salarioBruto = salarioBase;
  }

  const { horasOrdinarias, horasExtra } = await getHorasPeriodo(empleado.id, fechaInicio, fechaFin);

  const valorHoraOrdinaria = round2(salarioBase / 30 / empleado.horasJornada);
  const valorHoraExtra = round2(valorHoraOrdinaria * factorHorasExtra);
  const montoHorasExtra = round2(horasExtra * valorHoraExtra);

  const totalIngresos = round2(salarioBruto + montoHorasExtra + ingresosExtras);

  const ccssEmpleado = round2(totalIngresos * ccssTasa);
  const insEmpleado = round2(totalIngresos * insTasa);
  const bancoPopular = round2(totalIngresos * bpTasa);

  const salarioGravableRenta = round2(totalIngresos - ccssEmpleado);
  const tramos = await getTramosRentaActivos();
  const impuestoRenta = calcularImpuestoRenta(salarioGravableRenta, tramos);

  const totalDeduccionesLegales = round2(
    ccssEmpleado + insEmpleado + impuestoRenta + bancoPopular,
  );

  const salarioNeto = round2(
    totalIngresos - totalDeduccionesLegales - deduccionesAdicionales,
  );

  logger.info("PLANILLA_CALC", `Empleado ${empleado.id}: bruto=${salarioBruto}, neto=${salarioNeto}`);

  return {
    salarioBruto: formatCurrency(salarioBruto),
    horasOrdinarias: formatCurrency(horasOrdinarias),
    horasExtra: formatCurrency(horasExtra),
    montoHorasExtra: formatCurrency(montoHorasExtra),
    ccssEmpleado: formatCurrency(ccssEmpleado),
    insEmpleado: formatCurrency(insEmpleado),
    impuestoRenta: formatCurrency(impuestoRenta),
    bancoPopular: formatCurrency(bancoPopular),
    totalDeduccionesLegales: formatCurrency(totalDeduccionesLegales),
    salarioNeto: formatCurrency(salarioNeto),
  };
}

export function calcularTotalesPlanilla(
  detalles: ResultadoCalculo[],
  ingresosExtras: number[],
  deduccionesAdicionales: number[],
) {
  let totalSalariosBrutos = 0;
  let totalHorasExtra = 0;
  let totalBonos = 0;
  const totalComisiones = 0;
  let totalDeduccionesLegales = 0;
  let totalDeduccionesAdicionales = 0;
  let totalSalariosNeto = 0;

  for (let i = 0; i < detalles.length; i++) {
    const d = detalles[i];
    totalSalariosBrutos += parseFloat(d.salarioBruto);
    totalHorasExtra += parseFloat(d.montoHorasExtra);
    totalDeduccionesLegales += parseFloat(d.totalDeduccionesLegales);
    totalDeduccionesAdicionales += deduccionesAdicionales[i] || 0;
    totalSalariosNeto += parseFloat(d.salarioNeto);

    if (ingresosExtras[i]) {
      totalBonos += ingresosExtras[i];
    }
  }

  return {
    totalEmpleados: detalles.length,
    totalSalariosBrutos: formatCurrency(totalSalariosBrutos),
    totalHorasExtra: formatCurrency(totalHorasExtra),
    totalBonos: formatCurrency(totalBonos),
    totalComisiones: formatCurrency(totalComisiones),
    totalDeduccionesLegales: formatCurrency(totalDeduccionesLegales),
    totalDeduccionesAdicionales: formatCurrency(totalDeduccionesAdicionales),
    totalSalariosNeto: formatCurrency(totalSalariosNeto),
  };
}
