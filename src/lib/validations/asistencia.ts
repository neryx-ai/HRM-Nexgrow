import * as v from "valibot";

export const MarcarAsistenciaSchema = v.object({
  pin: v.pipe(
    v.string("El PIN debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu PIN."),
    v.length(6, "El PIN debe tener 6 dígitos."),
    v.regex(/^\d{6}$/, "El PIN solo debe contener números."),
  ),
  dispositivoId: v.optional(v.string()),
});

export const RegistroManualSchema = v.object({
  empleadoId: v.pipe(
    v.string("El ID del empleado es requerido."),
    v.nonEmpty("Seleccioná un empleado."),
  ),
  tipo: v.pipe(
    v.string("El tipo es requerido."),
    v.picklist(
      ["entrada", "salida", "ausencia", "incapacidad", "permiso", "vacacion"],
      "Tipo de registro inválido.",
    ),
  ),
  fecha: v.pipe(
    v.string("La fecha es requerida."),
    v.nonEmpty("La fecha es requerida."),
  ),
  hora: v.optional(v.string()),
  nota: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(500, "La nota no puede exceder 500 caracteres."),
    ),
  ),
});

export const CorteAutomaticoSchema = v.object({
  horaCorte: v.pipe(
    v.string("La hora de corte es requerida."),
    v.nonEmpty("La hora de corte es requerida."),
    v.regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)."),
  ),
  fecha: v.optional(v.pipe(v.string(), v.nonEmpty())),
});

export const CrearDispositivoSchema = v.object({
  nombre: v.pipe(
    v.string("El nombre es requerido."),
    v.nonEmpty("Ingresá un nombre para el dispositivo."),
    v.maxLength(100, "Máximo 100 caracteres."),
  ),
  sucursalId: v.pipe(
    v.string("La sucursal es requerida."),
    v.nonEmpty("Seleccioná una sucursal."),
  ),
});

export type MarcarAsistenciaData = v.InferOutput<typeof MarcarAsistenciaSchema>;
export type RegistroManualData = v.InferOutput<typeof RegistroManualSchema>;
export type CorteAutomaticoData = v.InferOutput<typeof CorteAutomaticoSchema>;
export type CrearDispositivoData = v.InferOutput<typeof CrearDispositivoSchema>;
