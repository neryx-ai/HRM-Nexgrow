import * as v from "valibot";

/**
 * Schema para el login
 */
export const LoginSchema = v.object({
  email: v.pipe(
    v.string("El correo electrónico debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu correo electrónico."),
    v.email("La dirección de correo electrónico no tiene un formato válido."),
  ),
  password: v.pipe(
    v.string("La contraseña debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu contraseña."),
    v.minLength(8, "La contraseña debe tener 8 caracteres o más."),
  ),
});

/**
 * Tipo de datos para el login
 */
export type LoginData = v.InferOutput<typeof LoginSchema>;

/**
 * Schema para el registro
 */
export const RegisterSchema = v.object({
  invitationCode: v.pipe(
    v.string("El código de invitación debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce el código de invitación."),
    v.length(6, "El código de invitación debe tener 6 caracteres."),
    v.regex(
      /^[A-Za-z0-9]{6}$/,
      "El código de invitación debe tener 6 caracteres.",
    ),
  ),
  email: v.pipe(
    v.string("El correo electrónico debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu correo electrónico."),
    v.email("La dirección de correo electrónico no tiene un formato válido."),
  ),
  password: v.pipe(
    v.string("La contraseña debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu contraseña."),
    v.minLength(8, "La contraseña debe tener 8 caracteres o más."),
    v.regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.",
    ),
  ),
  passwordConfirmation: v.pipe(
    v.string("La confirmación de la contraseña debe ser una cadena de texto."),
    v.nonEmpty("Por favor, confirma tu contraseña."),
    v.minLength(
      8,
      "La confirmación de la contraseña debe tener 8 caracteres o más.",
    ),
  ),
});

/**
 * Tipo de datos para el registro
 */
export type RegisterData = v.InferOutput<typeof RegisterSchema>;

/**
 * Schema para actualizar el perfil del usuario
 */
export const UpdateProfileSchema = v.object({
  name: v.pipe(
    v.string("El nombre debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu nombre."),
    v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
    v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
  ),
  image: v.optional(
    v.pipe(
      v.string("La URL de la imagen debe ser una cadena de texto."),
      v.url("La URL de la imagen no tiene un formato válido."),
    ),
  ),
});

/**
 * Tipo de datos para actualizar el perfil
 */
export type UpdateProfileData = v.InferOutput<typeof UpdateProfileSchema>;

/**
 * Schema para actualizar la contraseña
 */
export const UpdatePasswordSchema = v.object({
  currentPassword: v.pipe(
    v.string("La contraseña actual debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu contraseña actual."),
  ),
  newPassword: v.pipe(
    v.string("La nueva contraseña debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce una nueva contraseña."),
    v.minLength(8, "La nueva contraseña debe tener 8 caracteres o más."),
    v.regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.",
    ),
  ),
  confirmPassword: v.pipe(
    v.string("La confirmación de la contraseña debe ser una cadena de texto."),
    v.nonEmpty("Por favor, confirma tu nueva contraseña."),
  ),
});

/**
 * Tipo de datos para actualizar la contraseña
 */
export type UpdatePasswordData = v.InferOutput<typeof UpdatePasswordSchema>;