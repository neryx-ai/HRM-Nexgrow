import * as v from "valibot";

export const OtorgarVacacionSchema = v.object({
  empleadoId: v.pipe(
    v.string("El empleado es requerido."),
    v.nonEmpty("Seleccioná un empleado."),
    v.uuid("ID de empleado inválido."),
  ),
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
  motivo: v.pipe(
    v.string("El motivo es requerido."),
    v.nonEmpty("Ingresá un motivo para el otorgamiento."),
    v.maxLength(500, "El motivo no puede exceder 500 caracteres."),
  ),
  enviarNotificacion: v.optional(v.boolean()),
});

export const AjusteSaldoSchema = v.object({
  empleadoId: v.pipe(
    v.string("El empleado es requerido."),
    v.nonEmpty("Seleccioná un empleado."),
    v.uuid("ID de empleado inválido."),
  ),
  dias: v.pipe(
    v.number("Los días deben ser un número."),
    v.integer("Debe ser un número entero."),
    v.minValue(-365, "No podés descontar más de 365 días."),
    v.maxValue(365, "No podés agregar más de 365 días."),
  ),
  motivo: v.pipe(
    v.string("El motivo es requerido."),
    v.nonEmpty("Ingresá un motivo para el ajuste."),
    v.maxLength(500, "El motivo no puede exceder 500 caracteres."),
  ),
});

export const ConsumirVacacionSchema = v.object({
  empleadoId: v.pipe(
    v.string("El empleado es requerido."),
    v.nonEmpty("Seleccioná un empleado."),
    v.uuid("ID de empleado inválido."),
  ),
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
  dias: v.pipe(
    v.number("Los días deben ser un número."),
    v.integer("Debe ser un número entero."),
    v.minValue(1, "Mínimo 1 día."),
    v.maxValue(60, "Máximo 60 días."),
  ),
  motivo: v.pipe(
    v.string("El motivo es requerido."),
    v.nonEmpty("Ingresá un motivo."),
    v.maxLength(500, "El motivo no puede exceder 500 caracteres."),
  ),
  enviarNotificacion: v.optional(v.boolean()),
});

export type OtorgarVacacionData = v.InferOutput<typeof OtorgarVacacionSchema>;
export type AjusteSaldoData = v.InferOutput<typeof AjusteSaldoSchema>;
export type ConsumirVacacionData = v.InferOutput<typeof ConsumirVacacionSchema>;
