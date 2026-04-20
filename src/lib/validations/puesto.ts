import * as v from "valibot";

export const CreatePuestoSchema = v.object({
  nombre: v.pipe(
    v.string("El nombre debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce el nombre del puesto."),
    v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
    v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
  ),
  descripcion: v.optional(
    v.pipe(
      v.string("La descripción debe ser una cadena de texto."),
      v.maxLength(500, "La descripción no puede exceder 500 caracteres."),
    ),
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
});

export const UpdatePuestoSchema = v.object({
  id: v.pipe(v.string("El ID debe ser una cadena de texto."), v.nonEmpty("ID requerido.")),
  nombre: v.optional(
    v.pipe(
      v.string("El nombre debe ser una cadena de texto."),
      v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
      v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
    ),
  ),
  descripcion: v.optional(
    v.pipe(
      v.string("La descripción debe ser una cadena de texto."),
      v.maxLength(500, "La descripción no puede exceder 500 caracteres."),
    ),
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
});

export type CreatePuestoData = v.InferOutput<typeof CreatePuestoSchema>;
export type UpdatePuestoData = v.InferOutput<typeof UpdatePuestoSchema>;
