/**
 * Cálculo puro de meses cumplidos entre dos fechas.
 *
 * REGLA DE NEGOCIO
 * ----------------
 * Se otorga 1 día de vacaciones por cada mes cumplido desde la fecha de ingreso.
 * El "aniversario" se respeta al día: si el empleado entró el 24 de enero, el
 * día se cumple el 24 de cada mes siguiente (no el primero del mes).
 *
 * Esta función es la **única fuente de verdad** para este cálculo en todo el
 * sistema. Antes había 3 implementaciones distintas (TS con split, SQL con AGE,
 * TS con getDate) que divergían en zona horaria. Esta unifica todo.
 *
 * Casos borde documentados:
 * - Ingreso 2025-01-10, ref 2025-02-09 → 0 meses (no llegó al 10).
 * - Ingreso 2025-01-10, ref 2025-02-10 → 1 mes.
 * - Ingreso 2025-01-31, ref 2025-02-28 → 0 meses (febrero no tiene 31).
 * - Ingreso 2025-01-31, ref 2025-03-31 → 2 meses.
 *
 * Por qué NO usamos `new Date('YYYY-MM-DD')`: en zonas horarias al oeste de
 * UTC (ej. Costa Rica = UTC-6), `new Date('2025-02-08')` se parsea como
 * `2025-02-08T00:00:00Z` que en local es `2025-02-07 18:00:00`, así que
 * `getDate()` retorna 7 en vez de 8. Por eso parseamos el string manualmente.
 *
 * Por qué NO usamos `new Date().toISOString().split('T')[0]` para "hoy": por
 * el mismo motivo — retorna la fecha UTC, no la local. Usamos los métodos
 * locales de `Date` para construir la fecha de referencia.
 */
export function calcularMesesCumplidos(
  fechaIngreso: string,
  fechaReferencia?: string | Date,
): number {
  const ingreso = parseFecha(fechaIngreso);
  if (!ingreso) return 0;

  const ref = parseFecha(fechaReferencia ?? new Date());
  if (!ref) return 0;

  const [y1, m1, d1] = ingreso;
  const [y2, m2, d2] = ref;

  let meses = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) {
    meses -= 1;
  }
  return Math.max(0, meses);
}

/**
 * Días devengados por un empleado en la fecha indicada (1 por mes cumplido).
 * Alias semántico de `calcularMesesCumplidos` para usar en el contexto de
 * vacaciones.
 */
export function diasDevengados(
  fechaIngreso: string,
  fechaReferencia?: string | Date,
): number {
  return calcularMesesCumplidos(fechaIngreso, fechaReferencia);
}

/**
 * Devuelve la fecha de hoy como string `YYYY-MM-DD` en zona horaria local
 * (no UTC). Útil para usarla como `fechaReferencia` sin surprises de TZ.
 */
export function fechaHoyLocal(): string {
  const d = new Date();
  return formatYmd(d);
}

/**
 * Parsea una fecha en formato `YYYY-MM-DD` o un `Date` y retorna
 * `[año, mes, día]` en zona horaria local. Retorna `null` si la entrada
 * es inválida.
 */
function parseFecha(input: string | Date): [number, number, number] | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return [input.getFullYear(), input.getMonth() + 1, input.getDate()];
  }
  const partes = input.split("-").map(Number);
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [y, m, d] = partes;
  if (y < 1900) return null;
  return [y, m, d];
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
