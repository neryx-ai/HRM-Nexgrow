import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { sql } from "drizzle-orm";
import { VacacionesManager } from "@/components/modules/vacaciones/vacaciones-manager";

interface EmpleadoBasico {
  id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  email: string | null;
  sucursalNombre: string | null;
  puestoNombre: string | null;
  fechaIngreso: string;
}

type Role = "admin" | "rrhh" | "empleado";

export default async function VacacionesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const rol: Role = ((session.user.role as Role) ?? "empleado") as Role;

  if (rol === "empleado") {
    const [emp] = await db
      .select({
        id: sql<string>`id`,
        nombre: sql<string>`nombre`,
        apellidos: sql<string>`apellidos`,
        cedula: sql<string>`cedula::text`,
        fechaIngreso: sql<string>`fecha_ingreso::text`,
        puestoNombre: sql<string>`(SELECT nombre FROM puesto WHERE puesto.id = empleado.puesto_id)`,
        sucursalNombre: sql<string>`(SELECT nombre FROM sucursal WHERE sucursal.id = empleado.sucursal_id)`,
        email: sql<string>`(SELECT email FROM "user" WHERE "user".id = empleado.user_id)`,
      })
      .from(sql`empleado`)
      .where(sql`user_id = ${session.user.id}`)
      .limit(1);

    if (!emp) {
      return (
        <div className="p-2 pr-4">
          <h1 className="text-2xl font-bold mb-6 font-heading">Vacaciones</h1>
          <p className="text-muted-foreground">
            No se encontró un perfil de empleado asociado a tu usuario.
          </p>
        </div>
      );
    }

    const empleadoActual: EmpleadoBasico = {
      id: emp.id,
      nombre: emp.nombre,
      apellidos: emp.apellidos,
      cedula: emp.cedula,
      fechaIngreso: emp.fechaIngreso,
      puestoNombre: emp.puestoNombre ?? null,
      sucursalNombre: emp.sucursalNombre ?? null,
      email: emp.email ?? null,
    };

    return <VacacionesManager rol="empleado" empleadoActual={empleadoActual} />;
  }

  return <VacacionesManager rol={rol} empleadoActual={null} />;
}
