import { db } from "@/db/drizzle";
import { empleado } from "@/db/schema/empleado.schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type Empleado = InferSelectModel<typeof empleado>;

export interface MiEmpleadoResumen {
  id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  estado: string;
  sucursalId: string;
  puestoId: string;
  horaEntrada: string;
  horaSalida: string;
  horasJornada: number;
  pin: string | null;
  geolocalizacionHabilitada: boolean;
  consentimientoGeolocalizacionAt: Date | null;
}

/**
 * Resuelve el perfil de empleado asociado al `userId` autenticado.
 * Devuelve `null` si el usuario no tiene perfil.
 */
export async function getMiEmpleado(
  userId: string,
): Promise<Empleado | null> {
  const [row] = await db
    .select()
    .from(empleado)
    .where(eq(empleado.userId, userId))
    .limit(1);

  return row ?? null;
}

export function toResumen(row: Empleado): MiEmpleadoResumen {
  return {
    id: row.id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    cedula: row.cedula,
    estado: row.estado,
    sucursalId: row.sucursalId,
    puestoId: row.puestoId,
    horaEntrada: row.horaEntrada,
    horaSalida: row.horaSalida,
    horasJornada: row.horasJornada,
    pin: row.pin,
    geolocalizacionHabilitada: row.geolocalizacionHabilitada ?? false,
    consentimientoGeolocalizacionAt:
      row.consentimientoGeolocalizacionAt ?? null,
  };
}
