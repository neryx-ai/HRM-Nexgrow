import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReportesManager } from "@/components/modules/reportes/reportes-manager";

export default async function ReportesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string })?.role || "empleado";
  if (!["admin", "rrhh"].includes(userRole)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 p-2 md:pr-4">
      <div>
        {/* <h1 className="text-2xl font-bold font-heading">Reportes</h1> */}
        <p className="text-muted-foreground">
          Generá y exportá reportes de asistencia, costos, planilla y métricas
          de RRHH.
        </p>
      </div>
      <ReportesManager />
    </div>
  );
}
