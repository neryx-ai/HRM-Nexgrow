import { getResumenVacaciones } from "@/actions/vacacion.actions";
import { VacacionesManager } from "@/components/modules/vacaciones/vacaciones-manager";

interface SolicitudItem {
  solicitud: {
    id: string;
    empleadoId: string;
    fechaInicio: string;
    fechaFin: string;
    diasHabiles: number;
    estado: string;
    motivoRechazo: string | null;
    aprobadoEn: Date | null;
    nota: string | null;
    createdAt: Date;
  };
  empleadoNombre?: string;
  empleadoApellidos?: string;
  aprobadoPorNombre?: string;
}

interface SaldoItem {
  id: string;
  empleadoId: string;
  periodoInicio: string;
  periodoFin: string;
  diasOtorgados: number;
  diasDisponibles: number;
  diasUsados: number;
  diasPendientes: number;
}

interface FeriadoItem {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface ResumenData {
  solicitudes?: SolicitudItem[];
  saldos?: SaldoItem[];
  feriados?: FeriadoItem[];
  esEmpleado: boolean;
}

export default async function VacacionesPage() {
  const result = await getResumenVacaciones();
  const data = (result.data as ResumenData) || {
    solicitudes: [],
    saldos: [],
    feriados: [],
    esEmpleado: true,
  };

  return (
    <div className="p-2 pr-4">
      {/* <h1 className="text-2xl font-bold mb-6 font-heading">Vacaciones</h1> */}
      <VacacionesManager
        solicitudes={data.solicitudes || []}
        saldos={data.saldos || []}
        feriados={data.feriados || []}
        esEmpleado={data.esEmpleado}
      />
    </div>
  );
}
