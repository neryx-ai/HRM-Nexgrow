import { db } from "@/db/drizzle";
import { saldoVacaciones } from "@/db/schema/saldo-vacaciones.schema";
import {
  movimientoSaldoVacacion,
  type TipoMovimientoSaldo,
} from "@/db/schema/movimiento-saldo-vacacion.schema";
import { and, eq, sql, desc } from "drizzle-orm";

export const MAX_DIAS_POR_OTORGAMIENTO = 30;

export const TIPOS_POSITIVOS: ReadonlySet<TipoMovimientoSaldo> = new Set([
  "ajuste_positivo",
  "devengo",
]);

/**
 * Calcula los meses cumplidos entre una fecha de ingreso y una fecha de referencia,
 * respetando el día del mes. Si el empleado entró el 24 de enero, el día se cumple
 * el 24 de cada mes siguiente (no el primero del mes).
 *
 * Casos borde:
 * - Ingreso 2025-01-10, ref 2025-02-09 → 0 meses (no llegó al 10).
 * - Ingreso 2025-01-10, ref 2025-02-10 → 1 mes.
 * - Ingreso 2025-01-31, ref 2025-02-28 → 0 meses (febrero no tiene 31).
 * - Ingreso 2025-01-31, ref 2025-03-31 → 2 meses.
 */
export function mesesCumplidos(
  fechaIngreso: string,
  fechaReferencia: string = new Date().toISOString().split("T")[0],
): number {
  const [y1, m1, d1] = fechaIngreso.split("-").map(Number);
  const [y2, m2, d2] = fechaReferencia.split("-").map(Number);

  if (
    [y1, m1, d1, y2, m2, d2].some((n) => Number.isNaN(n)) ||
    y1 < 1900 ||
    y2 < 1900
  ) {
    return 0;
  }

  let meses = (y2 - y1) * 12 + (m2 - m1);

  if (d2 < d1) {
    meses -= 1;
  }

  return Math.max(0, meses);
}

/**
 * Días devengados por un empleado en la fecha indicada (1 por mes cumplido).
 */
export function diasDevengados(
  fechaIngreso: string,
  fechaReferencia?: string,
): number {
  return mesesCumplidos(fechaIngreso, fechaReferencia);
}

export interface ResumenSaldo {
  empleadoId: string;
  diasDevengados: number;
  totalOtorgamientos: number;
  totalAjustesPositivos: number;
  totalAjustesNegativos: number;
  diasDisponibles: number;
  diasOtorgados: number;
  diasUsados: number;
}

/**
 * Calcula el saldo actual de un empleado a partir de su fecha de ingreso
 * y del histórico de movimientos. Es una función pura de solo lectura.
 *
 * Fórmula:
 *   diasDisponibles = devengadosAcumulados
 *                   + sum(dias where tipo in (ajuste_positivo, devengo))
 *                   + sum(dias where tipo = 'otorgamiento')     // ya negativos
 *                   + sum(dias where tipo = 'ajuste_negativo')  // ya negativos
 */
export async function calcularSaldoEmpleado(
  empleadoId: string,
): Promise<ResumenSaldo> {
  const [emp] = await db
    .select({ fechaIngreso: sql<string>`fecha_ingreso::text` })
    .from(sql`empleado`)
    .where(sql`id = ${empleadoId}`)
    .limit(1);

  const fechaIngreso = emp?.fechaIngreso ?? "1900-01-01";
  const devengados = diasDevengados(fechaIngreso);

  const movimientos = await db
    .select({
      tipo: movimientoSaldoVacacion.tipo,
      totalDias: sql<number>`COALESCE(SUM(${movimientoSaldoVacacion.dias}), 0)`,
    })
    .from(movimientoSaldoVacacion)
    .where(eq(movimientoSaldoVacacion.empleadoId, empleadoId))
    .groupBy(movimientoSaldoVacacion.tipo);

  let totalOtorgamientos = 0;
  let totalAjustesPositivos = 0;
  let totalAjustesNegativos = 0;

  for (const m of movimientos) {
    const tipo = m.tipo as TipoMovimientoSaldo;
    const valor = Number(m.totalDias) || 0;
    if (tipo === "otorgamiento") totalOtorgamientos += valor;
    else if (tipo === "ajuste_positivo") totalAjustesPositivos += valor;
    else if (tipo === "ajuste_negativo") totalAjustesNegativos += valor;
    else if (tipo === "devengo") totalAjustesPositivos += valor;
  }

  const diasDisponibles =
    devengados + totalAjustesPositivos + totalOtorgamientos + totalAjustesNegativos;

  const diasUsados = Math.abs(totalOtorgamientos);

  return {
    empleadoId,
    diasDevengados: devengados,
    totalOtorgamientos,
    totalAjustesPositivos,
    totalAjustesNegativos,
    diasDisponibles,
    diasOtorgados: Math.abs(totalOtorgamientos),
    diasUsados,
  };
}

/**
 * Obtiene el resumen de saldo de un empleado garantizando que existe
 * una fila en `saldo_vacaciones`. Si no existe, la crea con contadores en 0.
 * Devuelve también los datos del empleado para mostrar en la UI.
 */
export async function obtenerResumenSaldoEmpleado(
  empleadoId: string,
): Promise<{
  resumen: ResumenSaldo;
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    cedula: string;
    fechaIngreso: string;
    puestoNombre: string | null;
    sucursalNombre: string | null;
    email: string | null;
  } | null;
}> {
  const [emp] = await db
    .select({
      id: sql<string>`id`,
      nombre: sql<string>`nombre`,
      apellidos: sql<string>`apellidos`,
      cedula: sql<string>`cedula::text`,
      fechaIngreso: sql<string>`fecha_ingreso::text`,
      puestoNombre: sql<string>`(SELECT nombre FROM puesto WHERE puesto.id = empleado.puesto_id)`,
      sucursalNombre: sql<string>`(SELECT nombre FROM sucursal WHERE sucursal.id = empleado.sucursal_id)`,
      email: sql<string>`(SELECT email FROM "user" WHERE "user".id = empleado.user_id)`,
    })
    .from(sql`empleado`)
    .where(sql`id = ${empleadoId}`)
    .limit(1);

  const resumen = await calcularSaldoEmpleado(empleadoId);

  if (!emp) {
    return { resumen, empleado: null };
  }

  await db
    .insert(saldoVacaciones)
    .values({
      empleadoId: emp.id,
      periodoInicio: emp.fechaIngreso,
      periodoFin: "2099-12-31",
      diasOtorgados: Math.abs(resumen.totalOtorgamientos),
      diasDisponibles: resumen.diasDisponibles,
      diasUsados: resumen.diasUsados,
      ultimaActualizacion: new Date(),
    })
    .onConflictDoNothing({
      target: [saldoVacaciones.empleadoId, saldoVacaciones.periodoInicio],
    });

  return {
    resumen,
    empleado: {
      id: emp.id,
      nombre: emp.nombre,
      apellidos: emp.apellidos,
      cedula: emp.cedula,
      fechaIngreso: emp.fechaIngreso,
      puestoNombre: emp.puestoNombre ?? null,
      sucursalNombre: emp.sucursalNombre ?? null,
      email: emp.email ?? null,
    },
  };
}

export interface MovimientoConEmpleado {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  tipo: TipoMovimientoSaldo;
  dias: number;
  motivo: string;
  realizadoPor: string;
  realizadoPorNombre: string | null;
  fecha: Date;
  metadata: unknown;
}

/**
 * Lista los movimientos de un empleado ordenados por fecha descendente.
 */
export async function listarMovimientosEmpleado(
  empleadoId: string,
  limite = 100,
): Promise<MovimientoConEmpleado[]> {
  const rows = await db
    .select({
      id: movimientoSaldoVacacion.id,
      empleadoId: movimientoSaldoVacacion.empleadoId,
      empleadoNombre: sql<string>`(
        SELECT (e.nombre || ' ' || e.apellidos)
        FROM empleado e
        WHERE e.id = ${movimientoSaldoVacacion.empleadoId}
      )`,
      tipo: movimientoSaldoVacacion.tipo,
      dias: movimientoSaldoVacacion.dias,
      motivo: movimientoSaldoVacacion.motivo,
      realizadoPor: movimientoSaldoVacacion.realizadoPor,
      realizadoPorNombre: sql<string | null>`(
        SELECT name FROM "user" WHERE "user".id = ${movimientoSaldoVacacion.realizadoPor}
      )`,
      fecha: movimientoSaldoVacacion.fecha,
      metadata: movimientoSaldoVacacion.metadata,
    })
    .from(movimientoSaldoVacacion)
    .where(eq(movimientoSaldoVacacion.empleadoId, empleadoId))
    .orderBy(desc(movimientoSaldoVacacion.fecha))
    .limit(limite);

  return rows.map((r) => ({
    id: r.id,
    empleadoId: r.empleadoId,
    empleadoNombre: r.empleadoNombre,
    tipo: r.tipo as TipoMovimientoSaldo,
    dias: r.dias,
    motivo: r.motivo,
    realizadoPor: r.realizadoPor,
    realizadoPorNombre: r.realizadoPorNombre,
    fecha: r.fecha,
    metadata: r.metadata,
  }));
}

export interface EmpleadoConSaldo {
  empleadoId: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  sucursalNombre: string | null;
  puestoNombre: string | null;
  email: string | null;
  fechaIngreso: string;
  diasDevengados: number;
  totalOtorgamientos: number;
  totalAjustesPositivos: number;
  totalAjustesNegativos: number;
  diasDisponibles: number;
  estado: string;
}

/**
 * Lista todos los empleados activos con su saldo calculado en una sola query.
 * Se usa para la vista de grilla de RRHH/admin.
 */
export async function listarEmpleadosConSaldo(filtros?: {
  busqueda?: string;
  sucursalId?: string;
  conSaldoBajo?: boolean;
}): Promise<EmpleadoConSaldo[]> {
  const condiciones = [sql`e.estado = 'activo'`];

  if (filtros?.busqueda) {
    condiciones.push(
      sql`(LOWER(e.nombre || ' ' || e.apellidos) LIKE LOWER(${"%" + filtros.busqueda + "%"}) OR e.cedula LIKE ${"%" + filtros.busqueda + "%"})`,
    );
  }

  if (filtros?.sucursalId) {
    condiciones.push(sql`e.sucursal_id = ${filtros.sucursalId}`);
  }

  const whereClause = and(...condiciones);

  const rows = await db
    .select({
      empleadoId: sql<string>`e.id`,
      nombre: sql<string>`e.nombre`,
      apellidos: sql<string>`e.apellidos`,
      cedula: sql<string>`e.cedula::text`,
      sucursalNombre: sql<string>`s.nombre`,
      puestoNombre: sql<string>`p.nombre`,
      email: sql<string>`u.email`,
      fechaIngreso: sql<string>`e.fecha_ingreso::text`,
      estado: sql<string>`e.estado`,
      diasDevengados: sql<number>`(
        SELECT GREATEST(
          0,
          (EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.fecha_ingreso)) * 12)
          + EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.fecha_ingreso))
          - CASE
              WHEN EXTRACT(DAY FROM CURRENT_DATE) < EXTRACT(DAY FROM e.fecha_ingreso)
              THEN 1 ELSE 0
            END
        )::int
      )`,
      totalOtorgamientos: sql<number>`COALESCE((
        SELECT SUM(m.dias) FROM movimiento_saldo_vacacion m
        WHERE m.empleado_id = e.id AND m.tipo = 'otorgamiento'
      ), 0)`,
      totalAjustesPositivos: sql<number>`COALESCE((
        SELECT SUM(m.dias) FROM movimiento_saldo_vacacion m
        WHERE m.empleado_id = e.id AND m.tipo IN ('ajuste_positivo', 'devengo')
      ), 0)`,
      totalAjustesNegativos: sql<number>`COALESCE((
        SELECT SUM(m.dias) FROM movimiento_saldo_vacacion m
        WHERE m.empleado_id = e.id AND m.tipo = 'ajuste_negativo'
      ), 0)`,
    })
    .from(sql`empleado e`)
    .leftJoin(sql`sucursal s`, sql`s.id = e.sucursal_id`)
    .leftJoin(sql`puesto p`, sql`p.id = e.puesto_id`)
    .leftJoin(sql`"user" u`, sql`u.id = e.user_id`)
    .where(whereClause)
    .orderBy(sql`e.apellidos, e.nombre`);

  let resultado: EmpleadoConSaldo[] = rows.map((r) => {
    const diasDevengados = Number(r.diasDevengados) || 0;
    const totalOtorgamientos = Number(r.totalOtorgamientos) || 0;
    const totalAjustesPositivos = Number(r.totalAjustesPositivos) || 0;
    const totalAjustesNegativos = Number(r.totalAjustesNegativos) || 0;

    const diasDisponibles =
      diasDevengados +
      totalAjustesPositivos +
      totalOtorgamientos +
      totalAjustesNegativos;

    return {
      empleadoId: r.empleadoId,
      nombre: r.nombre,
      apellidos: r.apellidos,
      cedula: r.cedula,
      sucursalNombre: r.sucursalNombre ?? null,
      puestoNombre: r.puestoNombre ?? null,
      email: r.email ?? null,
      fechaIngreso: r.fechaIngreso,
      diasDevengados,
      totalOtorgamientos,
      totalAjustesPositivos,
      totalAjustesNegativos,
      diasDisponibles,
      estado: r.estado,
    };
  });

  if (filtros?.conSaldoBajo) {
    resultado = resultado.filter((e) => e.diasDisponibles <= 5);
  }

  return resultado;
}
