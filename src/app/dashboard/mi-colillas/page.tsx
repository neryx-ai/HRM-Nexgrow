import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMisColillas } from "@/actions/mi-colilla.actions";
import { getMiEmpleado } from "@/lib/empleado";
import { MiColillasManager } from "@/components/modules/mi-colillas/mi-colillas-manager";
import type { MiColillaResumen } from "@/actions/mi-colilla.actions";

export default async function MiColillasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const miEmpleado = await getMiEmpleado(session.user.id);
  if (!miEmpleado) {
    return (
      <div className="p-2 md:pr-4">
        <h1 className="text-2xl font-bold mb-2 font-heading">Mis colillas</h1>
        <p className="text-muted-foreground">
          No tenés un perfil de empleado asociado a tu usuario. Contactá a
          Recursos Humanos.
        </p>
      </div>
    );
  }

  const result = await getMisColillas();
  const colillas = (result.data as { colillas: MiColillaResumen[] })?.colillas ?? [];

  return (
    <div className="p-2 md:pr-4">
      <MiColillasManager
        empleado={{
          nombre: miEmpleado.nombre,
          apellidos: miEmpleado.apellidos,
          cedula: miEmpleado.cedula,
        }}
        colillas={colillas}
      />
    </div>
  );
}