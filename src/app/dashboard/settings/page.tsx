import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getFeriados } from "@/actions/feriados.actions";
import { getTramosRenta } from "@/actions/tramo-renta.actions";
import { getDeduccionesConfig } from "@/actions/configuracion.actions";
import { listUsers } from "@/actions/user.actions";
import { getConfiguracionesGenerales } from "@/actions/configuracion-general.actions";
import { SettingsTabs } from "@/components/modules/configuracion/settings-tabs";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const userRole = (session.user as { role?: string })?.role || "empleado";
  if (userRole !== "admin") redirect("/dashboard");

  const [feriadosRes, tramosRes, deduccionesRes, usuariosRes, configGenRes] =
    await Promise.all([
      getFeriados(),
      getTramosRenta(),
      getDeduccionesConfig(),
      listUsers(),
      getConfiguracionesGenerales(),
    ]);

  const feriados = (feriadosRes.data as { feriados: unknown[] })?.feriados ?? [];
  const tramos = (tramosRes.data as { tramos: unknown[] })?.tramos ?? [];
  const deducciones = (deduccionesRes.data as { deducciones: unknown[] })?.deducciones ?? [];
  const usuarios = (usuariosRes.data as { users: unknown[] })?.users ?? [];
  const configuracionesGenerales =
    (configGenRes.data as { configuraciones: unknown[] })?.configuraciones ?? [];

  return (
    <div className="p-2 space-y-6 md:pr-4">
      <SettingsTabs
        deducciones={deducciones as never[]}
        feriados={feriados as never[]}
        tramos={tramos as never[]}
        usuarios={usuarios as never[]}
        configuracionesGenerales={configuracionesGenerales as never[]}
      />
    </div>
  );
}
