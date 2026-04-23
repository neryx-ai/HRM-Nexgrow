import * as v from "valibot";

export const CrearFeriadoSchema = v.object({
  fecha: v.pipe(
    v.string("La fecha es requerida."),
    v.nonEmpty("Ingresá una fecha."),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Usá AAAA-MM-DD."),
  ),
  nombre: v.pipe(
    v.string("El nombre es requerido."),
    v.nonEmpty("Ingresá el nombre del feriado."),
    v.maxLength(150, "Máximo 150 caracteres."),
  ),
  tipo: v.pipe(
    v.string("El tipo es requerido."),
    v.picklist(
      ["nacional", "religioso", "opcional"],
      "Tipo de feriado inválido.",
    ),
  ),
});

export const SolicitarVacacionSchema = v.object({
  fechaInicio: v.pipe(
    v.string("La fecha de inicio es requerida."),
    v.nonEmpty("Ingresá la fecha de inicio."),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Usá AAAA-MM-DD."),
  ),
  fechaFin: v.pipe(
    v.string("La fecha de fin es requerida."),
    v.nonEmpty("Ingresá la fecha de fin."),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Usá AAAA-MM-DD."),
  ),
  nota: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, "La nota no puede exceder 500 caracteres."),
    ),
  ),
});

export const AprobarRechazarVacacionSchema = v.object({
  solicitudId: v.pipe(
    v.string("El ID de la solicitud es requerido."),
    v.nonEmpty("El ID de la solicitud es requerido."),
  ),
  accion: v.pipe(
    v.string("La acción es requerida."),
    v.picklist(["aprobar", "rechazar"], "Acción inválida."),
  ),
  motivoRechazo: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, "El motivo no puede exceder 500 caracteres."),
    ),
  ),
});

export type CrearFeriadoData = v.InferOutput<typeof CrearFeriadoSchema>;
export type SolicitarVacacionData = v.InferOutput<typeof SolicitarVacacionSchema>;
export type AprobarRechazarVacacionData = v.InferOutput<typeof AprobarRechazarVacacionSchema>;
