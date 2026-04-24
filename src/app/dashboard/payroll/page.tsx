import { getPlanillas } from "@/actions/planilla.actions";
import { PlanillaManager } from "@/components/modules/planilla/planilla-manager";

interface PlanillaItem {
  planilla: {
    id: string;
    tipo: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    fechaPago: string | null;
    totalEmpleados: number;
    totalSalariosBrutos: string;
    totalDeduccionesLegales: string;
    totalDeduccionesAdicionales: string;
    totalSalariosNeto: string;
    creadoPor: string;
    confirmadoPor: string | null;
    confirmadoEn: Date | null;
    nota: string | null;
    createdAt: Date;
  };
  creadoPorNombre: string;
  confirmadoPorNombre: string | null;
}

export default async function PayrollPage() {
  const result = await getPlanillas();
  const data = (result.data as { planillas: PlanillaItem[] }) || {
    planillas: [],
  };

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-6">Planilla</h1>
      <PlanillaManager planillas={data.planillas || []} />
    </div>
  );
}
