import * as v from "valibot";

export const CreateSucursalSchema = v.object({
  nombre: v.pipe(
    v.string("El nombre debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce el nombre de la sucursal."),
    v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
    v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
  ),
  direccion: v.optional(
    v.pipe(
      v.string("La dirección debe ser una cadena de texto."),
      v.maxLength(500, "La dirección no puede exceder 500 caracteres."),
    ),
  ),
  telefono: v.optional(
    v.pipe(
      v.string("El teléfono debe ser una cadena de texto."),
      v.maxLength(20, "El teléfono no puede exceder 20 caracteres."),
    ),
  ),
});

export const UpdateSucursalSchema = v.object({
  id: v.pipe(v.string("El ID debe ser una cadena de texto."), v.nonEmpty("ID requerido.")),
  nombre: v.optional(
    v.pipe(
      v.string("El nombre debe ser una cadena de texto."),
      v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
      v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
    ),
  ),
  direccion: v.optional(
    v.pipe(
      v.string("La dirección debe ser una cadena de texto."),
      v.maxLength(500, "La dirección no puede exceder 500 caracteres."),
    ),
  ),
  telefono: v.optional(
    v.pipe(
      v.string("El teléfono debe ser una cadena de texto."),
      v.maxLength(20, "El teléfono no puede exceder 20 caracteres."),
    ),
  ),
  estado: v.optional(
    v.pipe(
      v.string("El estado debe ser una cadena de texto."),
      v.picklist(["activa", "inactiva"], "Estado inválido."),
    ),
  ),
});

export type CreateSucursalData = v.InferOutput<typeof CreateSucursalSchema>;
export type UpdateSucursalData = v.InferOutput<typeof UpdateSucursalSchema>;
