"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "./types";
import { db } from "@/db/drizzle";
import { configuracionDeduccion } from "@/db/schema/configuracion-deduccion.schema";
import { eq, sql } from "drizzle-orm";
import * as v from "valibot";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import {
  clearDeduccionesCache,
  generarClave,
} from "@/lib/planilla";

const VALOR_REGEX = /^\d+(\.\d{1,6})?$/;

const TipoSchema = v.picklist(["porcentaje", "monto_fijo", "factor"]);
const BaseSchema = v.picklist(["total_ingresos", "gravable_renta"]);

const CrearDeduccionSchema = v.object({
  nombre: v.pipe(
    v.string("El nombre es requerido."),
    v.nonEmpty("Ingresá un nombre."),
    v.maxLength(100, "Máximo 100 caracteres."),
  ),
  clave: v.optional(
    v.pipe(
      v.string(),
      v.maxLength(60, "Máximo 60 caracteres."),
      v.regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        "La clave debe iniciar con letra y solo letras, números o guión bajo.",
      ),
    ),
  ),
  tipo: TipoSchema,
  base: v.optional(BaseSchema),
  valor: v.pipe(
    v.string("El valor es requerido."),
    v.nonEmpty("Ingresá el valor."),
    v.regex(VALOR_REGEX, "Valor numérico inválido."),
  ),
  descripcion: v.optional(
    v.pipe(v.string(), v.maxLength(200, "Máximo 200 caracteres.")),
  ),
  orden: v.optional(v.pipe(v.number(), v.minValue(0))),
});

const ActualizarDeduccionSchema = v.object({
  id: v.pipe(v.string("ID requerido."), v.nonEmpty("ID requerido.")),
  nombre: v.pipe(
    v.string("El nombre es requerido."),
    v.nonEmpty("Ingresá un nombre."),
    v.maxLength(100, "Máximo 100 caracteres."),
  ),
  tipo: TipoSchema,
  base: v.optional(BaseSchema),
  valor: v.pipe(
    v.string("El valor es requerido."),
    v.nonEmpty("Ingresá el valor."),
    v.regex(VALOR_REGEX, "Valor numérico inválido."),
  ),
  descripcion: v.optional(
    v.pipe(v.string(), v.maxLength(200, "Máximo 200 caracteres.")),
  ),
  orden: v.optional(v.pipe(v.number(), v.minValue(0))),
  activo: v.optional(v.boolean()),
});

const EliminarDeduccionSchema = v.object({
  id: v.pipe(v.string("ID requerido."), v.nonEmpty("ID requerido.")),
});

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; response: ActionResponse }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      ok: false,
      response: { success: false, message: "No autorizado", data: {} },
    };
  }
  const role = (session.user as { role?: string })?.role || "empleado";
  if (role !== "admin") {
    return {
      ok: false,
      response: {
        success: false,
        message: "Solo administradores pueden modificar la configuración",
        data: {},
      },
    };
  }
  return { ok: true, userId: session.user.id };
}

async function resolveClave(
  requested: string | undefined,
  nombre: string,
): Promise<string> {
  if (requested && requested.trim().length > 0) return requested.trim();
  let base = generarClave(nombre);
  if (!base) base = "deduccion";
  let candidate = base;
  let suffix = 1;
  while (await existeClave(candidate)) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
    if (suffix > 100) break;
  }
  return candidate;
}

async function existeClave(clave: string): Promise<boolean> {
  const [row] = await db
    .select({ id: configuracionDeduccion.id })
    .from(configuracionDeduccion)
    .where(eq(configuracionDeduccion.clave, clave))
    .limit(1);
  return Boolean(row);
}

async function nextOrden(): Promise<number> {
  const [row] = await db
    .select({
      max: sql<number>`coalesce(max(${configuracionDeduccion.orden}), 0)`,
    })
    .from(configuracionDeduccion);
  return (row?.max ?? 0) + 10;
}

export async function getDeduccionesConfig(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return { success: false, message: "No autorizado", data: {} };

    const deducciones = await db
      .select()
      .from(configuracionDeduccion)
      .orderBy(configuracionDeduccion.categoria, configuracionDeduccion.orden);

    return {
      success: true,
      message: "Deducciones obtenidas",
      data: { deducciones },
    };
  } catch (error) {
    logger.error("CONFIG", "Error al obtener deducciones:", error);
    return { success: false, message: "Error al obtener deducciones", data: {} };
  }
}

export async function crearDeduccion(formData: unknown): Promise<ActionResponse> {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = v.safeParse(CrearDeduccionSchema, formData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Datos inválidos",
      data: { errors: parsed.issues },
    };
  }

  try {
    const clave = await resolveClave(parsed.output.clave, parsed.output.nombre);
    if (await existeClave(clave)) {
      return {
        success: false,
        message: "Ya existe una deducción con esa clave",
        data: {},
      };
    }

    const orden =
      parsed.output.orden !== undefined ? parsed.output.orden : await nextOrden();

    const [nueva] = await db
      .insert(configuracionDeduccion)
      .values({
        nombre: parsed.output.nombre,
        clave,
        tipo: parsed.output.tipo,
        base: parsed.output.base,
        valor: parsed.output.valor,
        descripcion: parsed.output.descripcion ?? null,
        categoria: "deduccion_legal",
        orden,
        activo: true,
      })
      .returning();

    clearDeduccionesCache();
    revalidatePath("/dashboard/settings");

    logger.info(
      "CONFIG",
      `Deducción creada por ${authResult.userId}: ${nueva.clave}`,
    );

    return {
      success: true,
      message: "Deducción creada exitosamente",
      data: { deduccion: nueva },
    };
  } catch (error) {
    logger.error("CONFIG", "Error al crear deducción:", error);
    return { success: false, message: "Error al crear deducción", data: {} };
  }
}

export async function actualizarDeduccion(
  formData: unknown,
): Promise<ActionResponse> {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = v.safeParse(ActualizarDeduccionSchema, formData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Datos inválidos",
      data: { errors: parsed.issues },
    };
  }

  try {
    const { id, nombre, tipo, base, valor, descripcion, orden, activo } =
      parsed.output;

    await db
      .update(configuracionDeduccion)
      .set({
        nombre,
        tipo,
        base,
        valor,
        descripcion: descripcion ?? null,
        ...(orden !== undefined ? { orden } : {}),
        ...(activo !== undefined ? { activo } : {}),
        updatedAt: new Date(),
      })
      .where(eq(configuracionDeduccion.id, id));

    clearDeduccionesCache();
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: "Deducción actualizada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("CONFIG", "Error al actualizar deducción:", error);
    return {
      success: false,
      message: "Error al actualizar deducción",
      data: {},
    };
  }
}

export async function eliminarDeduccion(
  formData: unknown,
): Promise<ActionResponse> {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = v.safeParse(EliminarDeduccionSchema, formData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Datos inválidos",
      data: { errors: parsed.issues },
    };
  }

  try {
    const [row] = await db
      .select()
      .from(configuracionDeduccion)
      .where(eq(configuracionDeduccion.id, parsed.output.id))
      .limit(1);

    if (!row) {
      return { success: false, message: "Deducción no encontrada", data: {} };
    }

    if (row.categoria === "parametro" && row.clave === "factorHorasExtra") {
      return {
        success: false,
        message:
          "Esta fila usa el esquema legacy. Aplicá la migración 0008 y volvé a intentar.",
        data: {},
      };
    }

    await db
      .delete(configuracionDeduccion)
      .where(eq(configuracionDeduccion.id, row.id));

    clearDeduccionesCache();
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: "Deducción eliminada exitosamente",
      data: {},
    };
  } catch (error) {
    logger.error("CONFIG", "Error al eliminar deducción:", error);
    return { success: false, message: "Error al eliminar deducción", data: {} };
  }
}

export async function toggleDeduccion(
  formData: unknown,
): Promise<ActionResponse> {
  const authResult = await requireAdmin();
  if (!authResult.ok) return authResult.response;

  const parsed = v.safeParse(EliminarDeduccionSchema, formData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Datos inválidos",
      data: { errors: parsed.issues },
    };
  }

  try {
    const [row] = await db
      .select()
      .from(configuracionDeduccion)
      .where(eq(configuracionDeduccion.id, parsed.output.id))
      .limit(1);

    if (!row) {
      return { success: false, message: "Deducción no encontrada", data: {} };
    }

    await db
      .update(configuracionDeduccion)
      .set({ activo: !row.activo, updatedAt: new Date() })
      .where(eq(configuracionDeduccion.id, row.id));

    clearDeduccionesCache();
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: row.activo
        ? "Deducción desactivada"
        : "Deducción activada",
      data: { activo: !row.activo },
    };
  } catch (error) {
    logger.error("CONFIG", "Error al alternar deducción:", error);
    return {
      success: false,
      message: "Error al alternar deducción",
      data: {},
    };
  }
}

export async function getConfiguracionGeneral(): Promise<ActionResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return { success: false, message: "No autorizado", data: {} };

    const userRole = (session.user as { role?: string })?.role || "empleado";
    if (userRole !== "admin") {
      return {
        success: false,
        message: "Solo administradores",
        data: {},
      };
    }

    const deducciones = await db
      .select()
      .from(configuracionDeduccion)
      .orderBy(configuracionDeduccion.categoria, configuracionDeduccion.orden);

    return {
      success: true,
      message: "Configuración obtenida",
      data: { deducciones },
    };
  } catch (error) {
    logger.error("CONFIG", "Error al obtener configuración:", error);
    return { success: false, message: "Error al obtener configuración", data: {} };
  }
}
