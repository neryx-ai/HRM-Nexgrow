import { getPlanillaDetalle } from "@/actions/planilla.actions";
import { PlanillaDetalle } from "@/components/modules/planilla/planilla-detalle";

interface DesgloseLegalItem {
  nombre: string;
  clave: string;
  tipo: "porcentaje" | "monto_fijo";
  base: "total_ingresos" | "gravable_renta";
  valor: string;
  monto: string;
}

interface DetalleItem {
  detalle: {
    id: string;
    planillaId: string;
    empleadoId: string;
    salarioBruto: string;
    horasOrdinarias: string;
    horasExtra: string;
    montoHorasExtra: string;
    desgloseDeduccionesLegales: DesgloseLegalItem[] | null;
    impuestoRenta: string;
    totalDeduccionesLegales: string;
    totalDeduccionesAdicionales: string;
    totalIngresosExtras: string;
    salarioNeto: string;
    colillaEnviada: string;
    nota: string | null;
  };
  empleadoNombre: string;
  empleadoApellidos: string;
  empleadoCedula: string;
  sucursalNombre: string | null;
  puestoNombre: string | null;
}

interface DeduccionItem {
  id: string;
  detallePlanillaId: string;
  empleadoId: string;
  concepto: string;
  monto: string;
  tipo: string;
}

interface IngresoItem {
  id: string;
  detallePlanillaId: string;
  empleadoId: string;
  concepto: string;
  monto: string;
  tipo: string;
}

interface PlanillaData {
  id: string;
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string | null;
  totalEmpleados: number;
  totalSalariosBrutos: string;
  totalHorasExtra: string;
  totalBonos: string;
  totalComisiones: string;
  totalDeduccionesLegales: string;
  totalDeduccionesAdicionales: string;
  totalSalariosNeto: string;
  creadoPor: string;
  confirmadoPor: string | null;
  confirmadoEn: Date | null;
  nota: string | null;
  createdAt: Date;
}

export default async function PlanillaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPlanillaDetalle(id);

  if (!result.success) {
    return (
      <div className="p-2">
        <p className="text-red-500">{result.message}</p>
      </div>
    );
  }

  const data = result.data as {
    planilla: PlanillaData;
    detalles: DetalleItem[];
    deducciones: DeduccionItem[];
    ingresos: IngresoItem[];
  };

  return (
    <div className="p-2">
      <PlanillaDetalle
        planilla={data.planilla}
        detalles={data.detalles}
        deducciones={data.deducciones}
        ingresos={data.ingresos}
      />
    </div>
  );
}
