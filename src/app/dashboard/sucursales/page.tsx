import { getSucursales } from "@/actions/sucursal.actions";
import { SucursalesManager } from "@/components/modules/sucursales/sucursales-manager";

interface SucursalesListResponse {
  sucursales: Array<{
    id: string;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    estado: "activa" | "inactiva";
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export default async function SucursalesPage() {
  const result = await getSucursales();

  if (!result.success || !result.data) {
    return (
      <div className="p-2">
        <h1>Sucursales</h1>
        <p className="text-muted-foreground">
          No se pudo cargar la información de sucursales.
        </p>
      </div>
    );
  }

  const data = result.data as SucursalesListResponse;
  const sucursales = data.sucursales;

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-6">Sucursales</h1>
      <SucursalesManager sucursales={sucursales} />
    </div>
  );
}
