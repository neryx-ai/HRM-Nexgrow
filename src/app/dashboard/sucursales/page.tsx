import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSucursales } from "@/actions/sucursal.actions";
import { SucursalesManager } from "@/components/modules/sucursales/sucursales-manager";
import { SucursalMapaForm } from "@/components/modules/sucursales/sucursal-mapa-form";
import { db } from "@/db/drizzle";
import { sucursal } from "@/db/schema/sucursal.schema";
import { eq } from "drizzle-orm";

interface SucursalCompleta {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  estado: "activa" | "inactiva";
  latitud: number | null;
  longitud: number | null;
  radioMetros: number;
  geocercaActiva: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default async function SucursalesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const result = await getSucursales();
  const data = (result.data as { sucursales?: SucursalCompleta[] }) ?? {
    sucursales: [],
  };
  const baseSucursales = data.sucursales ?? [];

  const sucursalesCompletas = await Promise.all(
    baseSucursales.map(async (s) => {
      const [full] = await db
        .select({
          id: sucursal.id,
          latitud: sucursal.latitud,
          longitud: sucursal.longitud,
          radioMetros: sucursal.radioMetros,
          geocercaActiva: sucursal.geocercaActiva,
        })
        .from(sucursal)
        .where(eq(sucursal.id, s.id))
        .limit(1);
      return { ...s, ...(full ?? {}) };
    }),
  );

  return (
    <div className="p-2 md:pr-4 space-y-6">
      <SucursalesManager sucursales={sucursalesCompletas} />
      <div className="grid gap-4">
        {sucursalesCompletas.map((s) => (
          <SucursalMapaForm
            key={s.id}
            sucursalId={s.id}
            sucursalNombre={s.nombre}
            latitudInicial={s.latitud}
            longitudInicial={s.longitud}
            radioInicial={s.radioMetros}
            geocercaActivaInicial={s.geocercaActiva}
          />
        ))}
      </div>
    </div>
  );
}
