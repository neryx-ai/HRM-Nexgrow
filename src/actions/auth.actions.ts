"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { user, account } from "@/db/schema/auth.schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import {
  UpdateProfileSchema,
  UpdatePasswordSchema,
  ForceChangePasswordSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
} from "@/lib/validations/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function login(formData: unknown): Promise<ActionResponse> {
  try {
    const session = await auth.api.signInEmail({
      headers: await headers(),
      body: {
        email: (formData as { email: string }).email,
        password: (formData as { password: string }).password,
        rememberMe: true,
      },
    });

    if (!session) {
      return {
        success: false,
        message: "No ha podido iniciar sesión.",
        data: {},
      };
    }

    return {
      success: true,
      message: "Usuario logueado exitosamente.",
      data: { user: session.user },
    };
  } catch (error) {
    logger.error("AUTH", "Error al loguear usuario:", error);
    return {
      success: false,
      message: "Error al loguear usuario.",
      data: {},
    };
  }
}

export async function logout(): Promise<ActionResponse> {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
    return {
      success: true,
      message: "Sesión cerrada exitosamente.",
      data: {},
    };
  } catch {
    return {
      success: false,
      message: "Error al cerrar sesión.",
      data: {},
    };
  }
}

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function getUserProfile(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "No autorizado",
        data: {},
      };
    }

    return {
      success: true,
      message: "Perfil obtenido exitosamente",
      data: { user: session.user },
    };
  } catch (error) {
    logger.error("AUTH", "Error al obtener perfil:", error);
    return {
      success: false,
      message: "Error al obtener el perfil",
      data: {},
    };
  }
}

export async function updateProfile(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "No autorizado",
        data: {},
      };
    }

    const parsed = v.safeParse(UpdateProfileSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    await db
      .update(user)
      .set({
        name: parsed.output.name,
        image: parsed.output.image ?? null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "Perfil actualizado exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("AUTH", "Error al actualizar perfil:", error);
    return {
      success: false,
      message: "Error al actualizar el perfil",
      data: {},
    };
  }
}

export async function updatePassword(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "No autorizado",
        data: {},
      };
    }

    const parsed = v.safeParse(UpdatePasswordSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    if (parsed.output.newPassword !== parsed.output.confirmPassword) {
      return {
        success: false,
        message: "Las contraseñas no coinciden",
        data: {},
      };
    }

    await auth.api.changePassword({
      headers: await headers(),
      body: {
        newPassword: parsed.output.newPassword,
        currentPassword: parsed.output.currentPassword,
        revokeOtherSessions: true,
      },
    });

    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "Contraseña actualizada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("AUTH", "Error al actualizar contraseña:", error);
    return {
      success: false,
      message: "Error al actualizar la contraseña",
      data: {},
    };
  }
}

export async function forceChangePassword(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "No autorizado",
        data: {},
      };
    }

    const parsed = v.safeParse(ForceChangePasswordSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    if (parsed.output.newPassword !== parsed.output.confirmPassword) {
      return {
        success: false,
        message: "Las contraseñas no coinciden",
        data: {},
      };
    }

    const [existingAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(eq(account.userId, session.user.id))
      .limit(1);

    if (!existingAccount) {
      return {
        success: false,
        message: "No se encontró la cuenta del usuario",
        data: {},
      };
    }

    await auth.api.changePassword({
      headers: await headers(),
      body: {
        newPassword: parsed.output.newPassword,
        currentPassword: "",
        revokeOtherSessions: true,
      },
    });

    await db
      .update(user)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Contraseña actualizada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("AUTH", "Error al forzar cambio de contraseña:", error);
    return {
      success: false,
      message: "Error al actualizar la contraseña",
      data: {},
    };
  }
}

export async function requestPasswordReset(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const parsed = v.safeParse(RequestPasswordResetSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

    await auth.api.requestPasswordReset({
      body: {
        email: parsed.output.email,
        redirectTo: `${baseUrl}/password-recovery/reset`,
      },
    });

    return {
      success: true,
      message:
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
      data: {},
    };
  } catch (error) {
    logger.error("AUTH", "Error al solicitar recuperación de contraseña:", error);
    return {
      success: true,
      message:
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
      data: {},
    };
  }
}

export async function resetPassword(
  formData: unknown,
): Promise<ActionResponse> {
  try {
    const parsed = v.safeParse(ResetPasswordSchema, formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Datos inválidos",
        data: { errors: parsed.issues },
      };
    }

    if (parsed.output.newPassword !== parsed.output.confirmPassword) {
      return {
        success: false,
        message: "Las contraseñas no coinciden",
        data: {},
      };
    }

    await auth.api.resetPassword({
      body: {
        newPassword: parsed.output.newPassword,
        token: parsed.output.token,
      },
    });

    return {
      success: true,
      message: "Contraseña restablecida exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("AUTH", "Error al restablecer contraseña:", error);
    return {
      success: false,
      message: "Error al restablecer la contraseña. El enlace puede haber expirado.",
      data: {},
    };
  }
}
