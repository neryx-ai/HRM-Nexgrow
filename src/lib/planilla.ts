import { db } from "@/db/drizzle";
import { tramoRenta } from "@/db/schema/tramo-renta.schema";
import { configuracionDeduccion } from "@/db/schema/configuracion-deduccion.schema";
import { resumenAsistenciaDiaria } from "@/db/schema/resumen-asistencia-diaria.schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { DeduccionLegalDesglose } from "@/db/schema/detalle-planilla.schema";

export const FACTOR_HORAS_EXTRA_DEFAULT = 1.5;
export const CACHE_TTL_MS = 60_000;

export type TipoDeduccion = "porcentaje" | "monto_fijo" | "factor";
export type TipoDeduccionLegal = Exclude<TipoDeduccion, "factor">;
export type BaseDeduccion = "total_ingresos" | "gravable_renta";

export interface ConfigDeduccionActiva {
  id: string;
  nombre: string;
  clave: string;
  tipo: TipoDeduccionLegal;
  base: BaseDeduccion;
  valor: string;
  descripcion: string | null;
  orden: number;
  activo: boolean | null;
}

export interface ConfigAplicables {
  legales: ConfigDeduccionActiva[];
  parametros: { factorHorasExtra: number };
}

let cached: ConfigAplicables | null = null;
let cacheTimestamp = 0;

export function clearDeduccionesCache(): void {
  cached = null;
  cacheTimestamp = 0;
}

export function generarClave(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export async function getDeduccionesAplicables(): Promise<ConfigAplicables> {
  const now = Date.now();
  if (cached && now - cacheTimestamp < CACHE_TTL_MS) {
    return cached;
  }

  const rows = await db
    .select()
    .from(configuracionDeduccion)
    .where(eq(configuracionDeduccion.activo, true))
    .orderBy(configuracionDeduccion.orden);

  const legales: ConfigDeduccionActiva[] = [];
  let factorHorasExtra = FACTOR_HORAS_EXTRA_DEFAULT;

  for (const r of rows) {
    if (r.tipo === "factor" && r.clave === "factorHorasExtra") {
      const v = parseFloat(r.valor);
      if (!Number.isNaN(v) && v > 0) factorHorasExtra = v;
      continue;
    }
    if (r.tipo !== "porcentaje" && r.tipo !== "monto_fijo") continue;
    if (!r.base) continue;
    const base = r.base as BaseDeduccion;
    legales.push({
      id: r.id,
      nombre: r.nombre,
      clave: r.clave,
      tipo: r.tipo,
      base,
      valor: r.valor,
      descripcion: r.descripcion,
      orden: r.orden,
      activo: r.activo,
    });
  }

  cached = { legales, parametros: { factorHorasExtra } };
  cacheTimestamp = now;
  return cached;
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
  desgloseDeduccionesLegales: DeduccionLegalDesglose[];
  impuestoRenta: string;
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
  const { legales, parametros } = await getDeduccionesAplicables();
  const { factorHorasExtra } = parametros;
  const salarioBase = parseFloat(empleado.salarioBase);

  let salarioBruto: number;
  if (tipo === "quincenal") {
    salarioBruto = round2(salarioBase / 2);
  } else {
    salarioBruto = salarioBase;
  }

  const { horasOrdinarias, horasExtra } = await getHorasPeriodo(
    empleado.id,
    fechaInicio,
    fechaFin,
  );

  const valorHoraOrdinaria =
    horasJornadaSafe(empleado.horasJornada) > 0
      ? round2(salarioBase / 30 / empleado.horasJornada)
      : 0;
  const valorHoraExtra = round2(valorHoraOrdinaria * factorHorasExtra);
  const montoHorasExtra = round2(horasExtra * valorHoraExtra);

  const totalIngresos = round2(salarioBruto + montoHorasExtra + ingresosExtras);

  const desglose: DeduccionLegalDesglose[] = [];
  let totalPreRenta = 0;

  for (const d of legales.filter((x) => x.base === "total_ingresos")) {
    const v = parseFloat(d.valor);
    const monto =
      d.tipo === "porcentaje"
        ? round2(totalIngresos * v)
        : round2(v);
    desglose.push({
      nombre: d.nombre,
      clave: d.clave,
      tipo: d.tipo,
      base: "total_ingresos",
      valor: d.valor,
      monto: formatCurrency(monto),
    });
    totalPreRenta += monto;
  }

  const gravableRenta = round2(totalIngresos - totalPreRenta);

  for (const d of legales.filter((x) => x.base === "gravable_renta")) {
    const v = parseFloat(d.valor);
    const monto =
      d.tipo === "porcentaje" ? round2(gravableRenta * v) : round2(v);
    desglose.push({
      nombre: d.nombre,
      clave: d.clave,
      tipo: d.tipo,
      base: "gravable_renta",
      valor: d.valor,
      monto: formatCurrency(monto),
    });
  }

  const tramos = await getTramosRentaActivos();
  const impuestoRenta = calcularImpuestoRenta(gravableRenta, tramos);

  const totalDeduccionesLegales = round2(totalPreRenta + impuestoRenta);

  const salarioNeto = round2(
    totalIngresos - totalDeduccionesLegales - deduccionesAdicionales,
  );

  logger.info(
    "PLANILLA_CALC",
    `Empleado ${empleado.id}: bruto=${salarioBruto}, neto=${salarioNeto}`,
  );

  return {
    salarioBruto: formatCurrency(salarioBruto),
    horasOrdinarias: formatCurrency(horasOrdinarias),
    horasExtra: formatCurrency(horasExtra),
    montoHorasExtra: formatCurrency(montoHorasExtra),
    desgloseDeduccionesLegales: desglose,
    impuestoRenta: formatCurrency(impuestoRenta),
    totalDeduccionesLegales: formatCurrency(totalDeduccionesLegales),
    salarioNeto: formatCurrency(salarioNeto),
  };
}

function horasJornadaSafe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
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
