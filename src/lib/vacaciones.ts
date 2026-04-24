import { db } from "@/db/drizzle";
import { feriado } from "@/db/schema/feriado.schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function calcularDiasHabiles(
  fechaInicio: string,
  fechaFin: string,
): Promise<number> {
  const inicio = new Date(fechaInicio + "T00:00:00");
  const fin = new Date(fechaFin + "T00:00:00");

  if (inicio > fin) return 0;

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

    if (diaSemana !== 0 && diaSemana !== 6 && !feriadoSet.has(fechaStr)) {
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
