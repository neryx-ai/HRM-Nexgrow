import * as v from "valibot";

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

export type LoginData = v.InferOutput<typeof LoginSchema>;

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

export type UpdateProfileData = v.InferOutput<typeof UpdateProfileSchema>;

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

export type UpdatePasswordData = v.InferOutput<typeof UpdatePasswordSchema>;

export const ForceChangePasswordSchema = v.object({
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

export type ForceChangePasswordData = v.InferOutput<typeof ForceChangePasswordSchema>;

export const CreateUserSchema = v.object({
  name: v.pipe(
    v.string("El nombre debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce el nombre."),
    v.minLength(2, "El nombre debe tener al menos 2 caracteres."),
    v.maxLength(100, "El nombre no puede exceder 100 caracteres."),
  ),
  email: v.pipe(
    v.string("El correo electrónico debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce el correo electrónico."),
    v.email("La dirección de correo electrónico no tiene un formato válido."),
  ),
  role: v.optional(
    v.pipe(
      v.string("El rol debe ser una cadena de texto."),
      v.picklist(["admin", "rrhh", "empleado"], "Rol inválido."),
    ),
  ),
});

export type CreateUserData = v.InferOutput<typeof CreateUserSchema>;

export const RequestPasswordResetSchema = v.object({
  email: v.pipe(
    v.string("El correo electrónico debe ser una cadena de texto."),
    v.nonEmpty("Por favor, introduce tu correo electrónico."),
    v.email("La dirección de correo electrónico no tiene un formato válido."),
  ),
});

export type RequestPasswordResetData = v.InferOutput<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = v.object({
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
  token: v.pipe(
    v.string("El token debe ser una cadena de texto."),
    v.nonEmpty("Token de recuperación inválido."),
  ),
});

export type ResetPasswordData = v.InferOutput<typeof ResetPasswordSchema>;