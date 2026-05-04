"use client";

import { authClient } from "@/lib/auth-client";
import { DashboardAdmin } from "./dashboard-admin";
import { DashboardEmpleado } from "./dashboard-empleado";

export function DashboardContent() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string })?.role || "empleado";

  if (role === "admin" || role === "rrhh") {
    return <DashboardAdmin />;
  }

  return <DashboardEmpleado />;
}
