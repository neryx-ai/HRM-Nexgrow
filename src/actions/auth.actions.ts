"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { user, account } from "@/db/schema/auth.schema";
import { eq, and } from "drizzle-orm";
import * as v from "valibot";
import {
  UpdateProfileSchema,
  UpdatePasswordSchema,
  type UpdateProfileData,
  type UpdatePasswordData,
} from "@/lib/validations/auth";
import { revalidatePath } from "next/cache";

export async function signup(formData: unknown): Promise<ActionResponse> {
  return {
    success: true,
    message: "Usuario registrado exitosamente.",
    data: {},
  };
}

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
    console.error("Error al loguear usuario:", error);
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
  } catch (error) {
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

/**
 * Obtiene el perfil del usuario autenticado
 */
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
    console.error("Error al obtener perfil:", error);
    return {
      success: false,
      message: "Error al obtener el perfil",
      data: {},
    };
  }
}

/**
 * Actualiza el perfil del usuario autenticado
 */
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
    console.error("Error al actualizar perfil:", error);
    return {
      success: false,
      message: "Error al actualizar el perfil",
      data: {},
    };
  }
}

/**
 * Actualiza la contraseña del usuario autenticado
 */
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

    // Verificar que las contraseñas coincidan
    if (parsed.output.newPassword !== parsed.output.confirmPassword) {
      return {
        success: false,
        message: "Las contraseñas no coinciden",
        data: {},
      };
    }

    // Verificar la contraseña actual usando Better-Auth
    // const userAccount = await db
    //   .select()
    //   .from(account)
    //   .where(
    //     and(
    //       eq(account.userId, session.user.id),
    //       eq(account.providerId, "email-password"),
    //     ),
    //   )
    //   .then((rows) => rows[0]);

    // if (!userAccount?.password) {
    //   return {
    //     success: false,
    //     message: "No se encontró la cuenta de contraseña",
    //     data: {},
    //   };
    // }

    // Cambiar la contraseña (changePassword ya verifica la contraseña actual)
    const data = await auth.api.changePassword({
      headers: await headers(),
      body: {
        newPassword: parsed.output.newPassword,
        currentPassword: parsed.output.currentPassword,
        revokeOtherSessions: true,
      },
    });

    console.log("Password updated data: ", data);

    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "Contraseña actualizada exitosamente",
      data: {},
    };
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    return {
      success: false,
      message: "Error al actualizar la contraseña",
      data: {},
    };
  }
}
