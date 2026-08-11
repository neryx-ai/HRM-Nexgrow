import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { eq, and, desc, gte } from "drizzle-orm";
import { registroAsistencia } from "@/db/schema/registro-asistencia.schema";
import { resumenAsistenciaDiaria } from "@/db/schema/resumen-asistencia-diaria.schema";
import { sucursal } from "@/db/schema/sucursal.schema";
import { getMiEmpleado } from "@/lib/empleado";
import { MiAsistenciaManager } from "./mi-asistencia-manager";

export default async function MiAsistenciaPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const emp = await getMiEmpleado(session.user.id);
  if (!emp) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 font-heading">Mi asistencia</h1>
        <p className="text-muted-foreground">
          No tenés un perfil de empleado asociado a tu usuario. Contactá a
          Recursos Humanos para que asignen tu cuenta.
        </p>
      </div>
    );
  }

  const [sucursalEmp] = await db
    .select()
    .from(sucursal)
    .where(eq(sucursal.id, emp.sucursalId))
    .limit(1);

  const today = new Date().toISOString().split("T")[0];
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const hace7Str = hace7.toISOString().split("T")[0];

  const [resumenHoy] = await db
    .select()
    .from(resumenAsistenciaDiaria)
    .where(
      and(
        eq(resumenAsistenciaDiaria.empleadoId, emp.id),
        eq(resumenAsistenciaDiaria.fecha, today),
      ),
    )
    .limit(1);

  const ultimosRegistros = await db
    .select()
    .from(registroAsistencia)
    .where(
      and(
        eq(registroAsistencia.empleadoId, emp.id),
        gte(registroAsistencia.timestamp, new Date(`${hace7Str}T00:00:00`)),
      ),
    )
    .orderBy(desc(registroAsistencia.timestamp))
    .limit(10);

  return (
    <div className="p-2 md:pr-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 font-heading">Mi asistencia</h1>
      <MiAsistenciaManager
        empleado={{
          id: emp.id,
          nombre: emp.nombre,
          apellidos: emp.apellidos,
          horaEntrada: emp.horaEntrada,
          horaSalida: emp.horaSalida,
          estado: emp.estado,
        }}
        sucursal={
          sucursalEmp
            ? {
                id: sucursalEmp.id,
                nombre: sucursalEmp.nombre,
                geocercaActiva: sucursalEmp.geocercaActiva,
                radioMetros: sucursalEmp.radioMetros,
                latitud: sucursalEmp.latitud,
                longitud: sucursalEmp.longitud,
              }
            : null
        }
        resumenHoy={resumenHoy ?? null}
        ultimosRegistros={ultimosRegistros}
      />
    </div>
  );
}
