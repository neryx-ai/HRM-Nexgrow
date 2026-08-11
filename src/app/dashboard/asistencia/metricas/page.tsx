import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSucursales } from "@/actions/sucursal.actions";
import { getEmpleadosActivos } from "@/actions/asistencia.actions";
import { getMetricasAsistencia } from "@/actions/asistencia.actions";
import { MetricasAsistencia } from "@/components/modules/asistencia/metricas-asistencia";

function defaultFechaInicio(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function defaultFechaFin(): string {
  return new Date().toISOString().split("T")[0];
}

export default async function MetricasAsistenciaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const userRole = (session.user as { role?: string })?.role || "empleado";
  if (!["admin", "rrhh"].includes(userRole)) {
    redirect("/dashboard");
  }

  const fechaInicio = defaultFechaInicio();
  const fechaFin = defaultFechaFin();

  const [metricasRes, sucursalesRes, empleadosRes] = await Promise.all([
    getMetricasAsistencia({ fechaInicio, fechaFin }),
    getSucursales(),
    getEmpleadosActivos(),
  ]);

  return (
    <div className="p-2 md:pr-4">
      <h1 className="text-2xl font-bold mb-4 font-heading">
        Métricas de Asistencia
      </h1>
      <MetricasAsistencia
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        sucursales={
          (sucursalesRes.data as { sucursales?: { id: string; nombre: string }[] })
            ?.sucursales ?? []
        }
        empleados={
          (empleadosRes.data as { empleados?: { id: string; nombre: string; apellidos: string; cedula: string }[] })
            ?.empleados ?? []
        }
        metricasIniciales={metricasRes.data as object | undefined}
      />
    </div>
  );
}
