import * as v from "valibot";

const CoordenadaSchema = v.object({
  lat: v.pipe(v.number(), v.minValue(-90), v.maxValue(90)),
  lng: v.pipe(v.number(), v.minValue(-180), v.maxValue(180)),
  accuracy: v.pipe(
    v.number(),
    v.minValue(0, "Precisión negativa."),
    v.maxValue(5000, "Precisión demasiado baja."),
  ),
  capturedAt: v.pipe(
    v.number(),
    v.minValue(0),
    v.maxValue(Date.now() + 5 * 60 * 1000, "Coordenada en el futuro."),
  ),
});

const ConsentimientoSchema = v.object({
  geolocalizacion: v.optional(v.boolean()),
});

export const MarcarAsistenciaSchema = v.object({
  coords: v.optional(CoordenadaSchema),
  consentimiento: v.optional(ConsentimientoSchema),
  pin: v.optional(
    v.pipe(
      v.string(),
      v.length(6, "El PIN debe tener 6 dígitos."),
      v.regex(/^\d{6}$/, "El PIN solo debe contener números."),
    ),
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

export const SolicitudPersonalSchema = v.object({
  tipo: v.pipe(
    v.string("El tipo es requerido."),
    v.picklist(
      ["dia_libre", "permiso", "incapacidad"],
      "Tipo de solicitud inválido.",
    ),
  ),
  fechaInicio: v.pipe(
    v.string("La fecha de inicio es requerida."),
    v.nonEmpty("La fecha de inicio es requerida."),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido. Usá AAAA-MM-DD."),
  ),
  fechaFin: v.pipe(
    v.string("La fecha de fin es requerida."),
    v.nonEmpty("La fecha de fin es requerida."),
    v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido. Usá AAAA-MM-DD."),
  ),
  motivo: v.optional(
    v.pipe(v.string(), v.maxLength(1000, "Máximo 1000 caracteres.")),
  ),
  adjuntoUrl: v.optional(
    v.pipe(v.string(), v.maxLength(500, "URL demasiado larga.")),
  ),
});

export const AprobarRechazarSolicitudPersonalSchema = v.object({
  solicitudId: v.pipe(
    v.string("El ID es requerido."),
    v.nonEmpty("ID requerido."),
  ),
  accion: v.pipe(
    v.string("La acción es requerida."),
    v.picklist(["aprobar", "rechazar"], "Acción inválida."),
  ),
  notaResolucion: v.optional(
    v.pipe(v.string(), v.maxLength(500, "Máximo 500 caracteres.")),
  ),
});

export const UpdateGeocercaSchema = v.object({
  sucursalId: v.pipe(
    v.string("El ID de la sucursal es requerido."),
    v.nonEmpty("ID de sucursal requerido."),
  ),
  latitud: v.nullable(
    v.pipe(
      v.number(),
      v.minValue(-90, "Latitud fuera de rango."),
      v.maxValue(90, "Latitud fuera de rango."),
    ),
  ),
  longitud: v.nullable(
    v.pipe(
      v.number(),
      v.minValue(-180, "Longitud fuera de rango."),
      v.maxValue(180, "Longitud fuera de rango."),
    ),
  ),
  radioMetros: v.pipe(
    v.number(),
    v.minValue(10, "El radio mínimo es 10 m."),
    v.maxValue(5000, "El radio máximo es 5 km."),
  ),
  geocercaActiva: v.boolean(),
});

export const ResolverNotificacionGeoSchema = v.object({
  notificacionId: v.pipe(
    v.string("El ID es requerido."),
    v.nonEmpty("ID requerido."),
  ),
  accion: v.pipe(
    v.string("La acción es requerida."),
    v.picklist(
      ["justificar", "descontar", "ignorar"],
      "Acción inválida.",
    ),
  ),
  nota: v.optional(
    v.pipe(v.string(), v.maxLength(500, "Máximo 500 caracteres.")),
  ),
});

export type MarcarAsistenciaData = v.InferOutput<typeof MarcarAsistenciaSchema>;
export type RegistroManualData = v.InferOutput<typeof RegistroManualSchema>;
export type CorteAutomaticoData = v.InferOutput<typeof CorteAutomaticoSchema>;
export type CrearDispositivoData = v.InferOutput<typeof CrearDispositivoSchema>;
export type SolicitudPersonalData = v.InferOutput<typeof SolicitudPersonalSchema>;
export type AprobarRechazarSolicitudPersonalData = v.InferOutput<typeof AprobarRechazarSolicitudPersonalSchema>;
export type UpdateGeocercaData = v.InferOutput<typeof UpdateGeocercaSchema>;
export type ResolverNotificacionGeoData = v.InferOutput<typeof ResolverNotificacionGeoSchema>;
