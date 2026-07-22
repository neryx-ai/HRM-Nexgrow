import { getPuestos } from "@/actions/puesto.actions";
import { PuestosManager } from "@/components/modules/puestos/puestos-manager";

interface Puesto {
  id: string;
  nombre: string;
  descripcion: string | null;
  salarioBase: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PuestosResponse {
  puestos: Puesto[];
}

export default async function PuestosPage() {
  const result = await getPuestos();

  if (!result.success || !result.data) {
    return (
      <div className="p-2">
        <h1 className="text-2xl font-bold mb-6 font-heading">Puestos</h1>
        <p className="text-muted-foreground">
          No se pudo cargar la información de los puestos.
        </p>
      </div>
    );
  }

  const data = result.data as PuestosResponse;

  return (
    <div className="p-2 md:pr-4">
      {/* <h1 className="text-2xl font-bold mb-6 font-heading">Gestión de Puestos</h1> */}
      <PuestosManager puestos={data.puestos} />
    </div>
  );
}
