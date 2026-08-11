import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DiasLibresManager } from "@/components/modules/dias-libres/dias-libres-manager";

type Role = "admin" | "rrhh" | "empleado";

export default async function DaysOffPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const rol: Role = ((session.user.role as Role) ?? "empleado") as Role;

  return <DiasLibresManager rol={rol} />;
}
