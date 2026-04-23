import { getHistorialAsistencia, getEmpleadosActivos } from "@/actions/asistencia.actions";
import { getSucursales } from "@/actions/sucursal.actions";
import { AsistenciaManager } from "@/components/modules/asistencia/asistencia-manager";

interface SucursalItem {
  id: string;
  nombre: string;
}

interface EmpleadoItem {
  id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  pin: string | null;
  sucursalNombre: string;
  puestoNombre: string;
  estado: string;
}

interface RegistroAsistencia {
  id: string;
  empleadoId: string;
  tipo: string;
  timestamp: Date;
  fuente: string;
  nota: string | null;
}

interface ResumenAsistencia {
  id: string;
  empleadoId: string;
  fecha: string;
  horasOrdinarias: string;
  horasExtra: string;
  ausente: boolean;
  tieneEntrada: boolean;
  tieneSalida: boolean;
  horaEntrada: Date | null;
  horaSalida: Date | null;
  retraso: boolean;
  minutosRetraso: string;
}

interface HistorialItem {
  resumen: ResumenAsistencia;
  empleadoNombre: string;
  empleadoApellidos: string;
  empleadoCedula: string;
  sucursalNombre: string;
  puestoNombre: string;
}

interface SucursalesResponse {
  sucursales: SucursalItem[];
}

interface EmpleadosResponse {
  empleados: EmpleadoItem[];
}

interface HistorialResponse {
  registros: HistorialItem[];
}

export default async function AsistenciaPage() {
  const historialResult = await getHistorialAsistencia();
  const sucursalesResult = await getSucursales();
  const empleadosResult = await getEmpleadosActivos();

  const historialData = (historialResult.data as HistorialResponse)?.registros || [];
  const sucursalesData = (sucursalesResult.data as SucursalesResponse)?.sucursales || [];
  const empleadosData = (empleadosResult.data as EmpleadosResponse)?.empleados || [];

  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-6">Asistencia</h1>
      <AsistenciaManager
        historialInicial={historialData}
        sucursales={sucursalesData}
        empleados={empleadosData}
      />
    </div>
  );
}
