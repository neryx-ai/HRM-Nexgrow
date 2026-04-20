import * as v from "valibot";

export const CreateEmpleadoSchema = v.object({
  sucursalId: v.pipe(
    v.string("La sucursal es requerida."),
    v.nonEmpty("Por favor, selecciona una sucursal."),
    v.uuid("ID de sucursal inválido."),
  ),
  puestoId: v.pipe(
    v.string("El puesto es requerido."),
    v.nonEmpty("Por favor, selecciona un puesto."),
    v.uuid("ID de puesto inválido."),
  ),
  nombre: v.pipe(
    v.string("El nombre debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce el nombre."),
    v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
    v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
  ),
  apellidos: v.pipe(
    v.string("Los apellidos deben ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce los apellidos."),
    v.minLength(2, "Los apellidos deben tener al menos 2 caracteres."),
    v.maxLength(100, "Los apellidos no pueden exceder 100 caracteres."),
  ),
  cedula: v.pipe(
    v.string("La cédula debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce la cédula."),
    v.minLength(9, "La cédula debe tener al menos 9 caracteres."),
    v.maxLength(20, "La cédula no puede exceder 20 caracteres."),
  ),
  email: v.pipe(
    v.string("El correo electrónico debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce el correo electrónico."),
    v.email("La dirección de correo electrónico no tiene un formato válido."),
  ),
  telefono: v.optional(
    v.pipe(
      v.string("El teléfono debe ser una cadena de texto."),
      v.maxLength(20, "El teléfono no puede exceder 20 caracteres."),
    ),
  ),
  fechaNacimiento: v.optional(
    v.pipe(
      v.string("La fecha de nacimiento debe ser una cadena de texto."),
      v.isoDate("Formato de fecha inválido (YYYY-MM-DD)."),
    ),
  ),
  direccion: v.optional(
    v.pipe(
      v.string("La dirección debe ser una cadena de texto."),
      v.maxLength(500, "La dirección no puede exceder 500 caracteres."),
    ),
  ),
  fechaIngreso: v.pipe(
    v.string("La fecha de ingreso es requerida."),
    v.nonEmpty("Por favor, introduce la fecha de ingreso."),
    v.isoDate("Formato de fecha inválido (YYYY-MM-DD)."),
  ),
  salarioBase: v.pipe(
    v.union(
      [v.string(), v.number()],
      "El salario base es requerido.",
    ),
    v.transform(String),
    v.nonEmpty("Por favor, introduce el salario base."),
    v.decimal("El salario base debe ser un número decimal válido."),
    v.transform(Number),
    v.minValue(1, "El salario base debe ser mayor a 0."),
  ),
  tipoJornada: v.optional(
    v.pipe(
      v.string("El tipo de jornada debe ser una cadena de texto."),
      v.picklist(["completa", "parcial"], "Tipo de jornada inválido."),
    ),
  ),
  horasJornada: v.optional(
    v.pipe(
      v.number("Las horas de jornada deben ser un número."),
      v.minValue(1, "Las horas de jornada deben ser al menos 1."),
      v.maxValue(12, "Las horas de jornada no pueden exceder 12."),
    ),
  ),
  horaEntrada: v.optional(
    v.pipe(
      v.string("La hora de entrada debe ser una cadena de texto."),
    ),
  ),
  horaSalida: v.optional(
    v.pipe(
      v.string("La hora de salida debe ser una cadena de texto."),
    ),
  ),
});

export const UpdateEmpleadoSchema = v.object({
  id: v.pipe(v.string("El ID debe ser una cadena de texto."), v.nonEmpty("ID requerido.")),
  sucursalId: v.optional(
    v.pipe(v.string("La sucursal debe ser una cadena de texto."), v.uuid("ID de sucursal inválido.")),
  ),
  puestoId: v.optional(
    v.pipe(v.string("El puesto debe ser una cadena de texto."), v.uuid("ID de puesto inválido.")),
  ),
  nombre: v.optional(
    v.pipe(
      v.string("El nombre debe ser una cadena de texto."),
      v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
      v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
    ),
  ),
  apellidos: v.optional(
    v.pipe(
      v.string("Los apellidos deben ser una cadena de texto."),
      v.minLength(2, "Los apellidos deben tener al menos 2 caracteres."),
      v.maxLength(100, "Los apellidos no pueden exceder 100 caracteres."),
    ),
  ),
  telefono: v.optional(
    v.pipe(v.string("El teléfono debe ser una cadena de texto."), v.maxLength(20, "El teléfono no puede exceder 20 caracteres.")),
  ),
  fechaNacimiento: v.optional(
    v.pipe(v.string("La fecha de nacimiento debe ser una cadena de texto."), v.isoDate("Formato de fecha inválido.")),
  ),
  direccion: v.optional(
    v.pipe(v.string("La dirección debe ser una cadena de texto."), v.maxLength(500, "La dirección no puede exceder 500 caracteres.")),
  ),
  fechaIngreso: v.optional(
    v.pipe(v.string("La fecha de ingreso debe ser una cadena de texto."), v.isoDate("Formato de fecha inválido.")),
  ),
  salarioBase: v.optional(
    v.pipe(
      v.union(
        [v.string(), v.number()],
        "El salario base debe ser un número.",
      ),
      v.transform(String),
      v.decimal("El salario base debe ser un número decimal válido."),
      v.transform(Number),
      v.minValue(1, "El salario base debe ser mayor a 0."),
    ),
  ),
  tipoJornada: v.optional(
    v.pipe(v.string("El tipo de jornada debe ser una cadena de texto."), v.picklist(["completa", "parcial"], "Tipo de jornada inválido.")),
  ),
  horasJornada: v.optional(
    v.pipe(v.number("Las horas de jornada deben ser un número."), v.minValue(1, "Las horas deben ser al menos 1."), v.maxValue(12, "Las horas no pueden exceder 12.")),
  ),
  horaEntrada: v.optional(v.string("La hora de entrada debe ser una cadena de texto.")),
  horaSalida: v.optional(v.string("La hora de salida debe ser una cadena de texto.")),
  estado: v.optional(
    v.pipe(v.string("El estado debe ser una cadena de texto."), v.picklist(["activo", "inactivo", "licencia"], "Estado inválido.")),
  ),
});

export type CreateEmpleadoData = v.InferOutput<typeof CreateEmpleadoSchema>;
export type UpdateEmpleadoData = v.InferOutput<typeof UpdateEmpleadoSchema>;
