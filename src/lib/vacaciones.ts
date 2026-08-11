import { db } from "@/db/drizzle";
import { feriado } from "@/db/schema/feriado.schema";
import { configuracionGeneral } from "@/db/schema/configuracion-general.schema";
import { and, eq, gte, lte } from "drizzle-orm";

export async function getSabadoHabil(): Promise<boolean> {
  try {
    const [row] = await db
      .select({ valor: configuracionGeneral.valor })
      .from(configuracionGeneral)
      .where(eq(configuracionGeneral.clave, "sabado_habil"))
      .limit(1);
    return row?.valor === "true";
  } catch {
    return false;
  }
}

export async function calcularDiasHabiles(
  fechaInicio: string,
  fechaFin: string,
  options?: { incluirSabado?: boolean },
): Promise<number> {
  const inicio = new Date(fechaInicio + "T00:00:00");
  const fin = new Date(fechaFin + "T00:00:00");

  if (inicio > fin) return 0;

  const incluirSabado =
    options?.incluirSabado ?? (await getSabadoHabil());

  const feriadosActivos = await db
    .select({ fecha: feriado.fecha })
    .from(feriado)
    .where(
      and(
        feriado.activo,
        gte(feriado.fecha, fechaInicio),
        lte(feriado.fecha, fechaFin),
      ),
    );

  const feriadoSet = new Set(feriadosActivos.map((f) => f.fecha));

  let diasHabiles = 0;
  const actual = new Date(inicio);

  while (actual <= fin) {
    const diaSemana = actual.getDay();
    const fechaStr = actual.toISOString().split("T")[0];

    const esDomingo = diaSemana === 0;
    const esSabado = diaSemana === 6;
    const esFeriado = feriadoSet.has(fechaStr);

    if (!esDomingo && !esFeriado && !(esSabado && !incluirSabado)) {
      diasHabiles++;
    }

    actual.setDate(actual.getDate() + 1);
  }

  return diasHabiles;
}

export function calcularDiasVacacionPorAniosServicio(anios: number): number {
  if (anios < 1) return 0;
  return 14;
}
