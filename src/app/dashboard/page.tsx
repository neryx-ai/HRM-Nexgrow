import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/modules/dashboard/dashboard-content";
import { DashboardAdmin } from "@/components/modules/dashboard/dashboard-admin";
import { DashboardEmpleado } from "@/components/modules/dashboard/dashboard-empleado";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session?.user as { role?: string })?.role || "empleado";

  if (role === "admin" || role === "rrhh") {
      return <DashboardAdmin />;
    }

  return <DashboardEmpleado />;
}
