"use client";

// import { authClient } from "@/lib/auth-client";
import { DashboardAdmin } from "./dashboard-admin";
import { DashboardEmpleado } from "./dashboard-empleado";
import { Session } from "@/types/sessions";

export function DashboardContent({ session }: { session: Session }) {
  // const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string })?.role || "empleado";

  if (role === "admin" || role === "rrhh") {
    return <DashboardAdmin session={session} />;
  }

  return <DashboardEmpleado />;
}
