import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getFeriados } from "@/actions/feriados.actions";
import { getTramosRenta } from "@/actions/tramo-renta.actions";
import { getDeduccionesConfig } from "@/actions/configuracion.actions";
import { listUsers } from "@/actions/user.actions";
import { SettingsTabs } from "@/components/modules/configuracion/settings-tabs";
import { Cog } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const userRole = (session.user as { role?: string })?.role || "empleado";
  if (userRole !== "admin") redirect("/dashboard");

  const [feriadosRes, tramosRes, deduccionesRes, usuariosRes] = await Promise.all([
    getFeriados(),
    getTramosRenta(),
    getDeduccionesConfig(),
    listUsers(),
  ]);

  const feriados = (feriadosRes.data as { feriados: unknown[] })?.feriados ?? [];
  const tramos = (tramosRes.data as { tramos: unknown[] })?.tramos ?? [];
  const deducciones = (deduccionesRes.data as { deducciones: unknown[] })?.deducciones ?? [];
  const usuarios = (usuariosRes.data as { users: unknown[] })?.users ?? [];

  return (
    <div className="p-2 space-y-6 md:pr-4">
      {/* <div className="flex items-center gap-2">
        <Cog className="h-6 w-6" />
        <h1 className="text-2xl font-bold font-heading">Configuración</h1>
      </div> */}
      <SettingsTabs
        deducciones={deducciones as never[]}
        feriados={feriados as never[]}
        tramos={tramos as never[]}
        usuarios={usuarios as never[]}
      />
    </div>
  );
}
