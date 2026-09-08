import * as v from "valibot";

export const CrearPlanillaSchema = v.object({
  tipo: v.pipe(
    v.string("El tipo es requerido."),
    v.picklist(["mensual", "quincenal"], "Tipo de planilla inválido."),
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
  nota: v.optional(
    v.pipe(v.string(), v.maxLength(500, "La nota no puede exceder 500 caracteres.")),
  ),
});

export const AgregarDeduccionSchema = v.object({
  detallePlanillaId: v.pipe(
    v.string("El ID del detalle es requerido."),
    v.nonEmpty("El ID del detalle es requerido."),
  ),
  empleadoId: v.pipe(
    v.string("El ID del empleado es requerido."),
    v.nonEmpty("El ID del empleado es requerido."),
  ),
  concepto: v.pipe(
    v.string("El concepto es requerido."),
    v.nonEmpty("Ingresá el concepto."),
    v.maxLength(200, "Máximo 200 caracteres."),
  ),
  monto: v.pipe(
    v.string("El monto es requerido."),
    v.nonEmpty("Ingresá el monto."),
    v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido. Usá formato: 0.00"),
  ),
  tipo: v.pipe(
    v.string("El tipo es requerido."),
    v.picklist(
      ["prestamo", "dano", "descuento_judicial", "otro"],
      "Tipo de deducción inválido.",
    ),
  ),
});

export const AgregarIngresoExtraSchema = v.object({
  detallePlanillaId: v.pipe(
    v.string("El ID del detalle es requerido."),
    v.nonEmpty("El ID del detalle es requerido."),
  ),
  empleadoId: v.pipe(
    v.string("El ID del empleado es requerido."),
    v.nonEmpty("El ID del empleado es requerido."),
  ),
  concepto: v.pipe(
    v.string("El concepto es requerido."),
    v.nonEmpty("Ingresá el concepto."),
    v.maxLength(200, "Máximo 200 caracteres."),
  ),
  monto: v.pipe(
    v.string("El monto es requerido."),
    v.nonEmpty("Ingresá el monto."),
    v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido. Usá formato: 0.00"),
  ),
  tipo: v.pipe(
    v.string("El tipo es requerido."),
    v.picklist(
      ["bono", "comision", "horas_extra_doble", "otro"],
      "Tipo de ingreso inválido.",
    ),
  ),
});

export const ConfirmarPlanillaSchema = v.object({
  planillaId: v.pipe(
    v.string("El ID de la planilla es requerido."),
    v.nonEmpty("El ID de la planilla es requerido."),
  ),
  fechaPago: v.pipe(
    v.string("La fecha de pago es requerida."),
    v.nonEmpty("Ingresá la fecha de pago."),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido. Usá AAAA-MM-DD."),
  ),
});

export const CrearTramoRentaSchema = v.object({
  limiteInferior: v.pipe(
    v.string("El límite inferior es requerido."),
    v.nonEmpty("Ingresá el límite inferior."),
    v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido."),
  ),
  limiteSuperior: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido."),
    ),
  ),
  porcentaje: v.pipe(
    v.string("El porcentaje es requerido."),
    v.nonEmpty("Ingresá el porcentaje."),
    v.regex(/^\d+(\.\d{1,2})?$/, "Porcentaje inválido."),
  ),
  montoExcedente: v.pipe(
    v.string("El monto excedente es requerido."),
    v.nonEmpty("Ingresá el monto excedente."),
    v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido."),
  ),
  descripcion: v.optional(
    v.pipe(v.string(), v.maxLength(200, "Máximo 200 caracteres.")),
  ),
});

export const ReenviarColillaSchema = v.object({
  detallePlanillaId: v.pipe(
    v.string("El ID del detalle es requerido."),
    v.nonEmpty("El ID del detalle es requerido."),
  ),
});

export const ReenviarColillaTodasSchema = v.object({
  planillaId: v.pipe(
    v.string("El ID de la planilla es requerido."),
    v.nonEmpty("El ID de la planilla es requerido."),
  ),
});

export type CrearPlanillaData = v.InferOutput<typeof CrearPlanillaSchema>;
export type AgregarDeduccionData = v.InferOutput<typeof AgregarDeduccionSchema>;
export type AgregarIngresoExtraData = v.InferOutput<typeof AgregarIngresoExtraSchema>;
export type ConfirmarPlanillaData = v.InferOutput<typeof ConfirmarPlanillaSchema>;
export type CrearTramoRentaData = v.InferOutput<typeof CrearTramoRentaSchema>;
export type ReenviarColillaData = v.InferOutput<typeof ReenviarColillaSchema>;
export type ReenviarColillaTodasData = v.InferOutput<
  typeof ReenviarColillaTodasSchema
>;
