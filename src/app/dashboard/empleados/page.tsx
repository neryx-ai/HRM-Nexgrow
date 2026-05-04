import { getEmpleados } from "@/actions/empleado.actions";
import { getSucursales } from "@/actions/sucursal.actions";
import { getPuestos } from "@/actions/puesto.actions";
import { EmpleadosManager } from "@/components/modules/empleados/empleados-manager";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { empleado } from "@/db/schema/empleado.schema";
import { eq } from "drizzle-orm";

interface EmpleadoRow {
  empleado: {
    id: string;
    userId: string | null;
    sucursalId: string;
    puestoId: string;
    nombre: string;
    apellidos: string;
    cedula: string;
    telefono: string | null;
    fechaNacimiento: string | null;
    direccion: string | null;
    fechaIngreso: string;
    salarioBase: string;
    tipoJornada: "completa" | "parcial";
    horasJornada: number | null;
    horaEntrada: string | null;
    horaSalida: string | null;
    pin: string | null;
    estado: "activo" | "inactivo" | "licencia";
    createdAt: Date;
    updatedAt: Date;
  };
  sucursalNombre: string;
  puestoNombre: string;
}

interface SucursalItem {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  estado: "activa" | "inactiva";
  createdAt: Date;
  updatedAt: Date;
}

interface PuestoItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  salarioBase: string;
  createdAt: Date;
  updatedAt: Date;
}

export default async function EmpleadosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role || "empleado";

  if (userRole === "empleado" && session?.user?.id) {
    const [emp] = await db
      .select({ id: empleado.id })
      .from(empleado)
      .where(eq(empleado.userId, session.user.id))
      .limit(1);

    if (emp) {
      redirect(`/dashboard/empleados/${emp.id}`);
    }
  }

  const [empleadosRes, sucursalesRes, puestosRes] = await Promise.all([
    getEmpleados(),
    getSucursales(),
    getPuestos(),
  ]);

  if (!empleadosRes.success || !empleadosRes.data) {
    return (
      <div className="p-2 pr-4 pb-10">
        <h1 className="text-2xl font-bold mb-6">Empleados</h1>
        <p className="text-muted-foreground">
          No se pudo cargar la información de empleados.
        </p>
      </div>
    );
  }

  const empleadosData = empleadosRes.data as { empleados: EmpleadoRow[] };

  const sucursales =
    sucursalesRes.success && sucursalesRes.data
      ? (sucursalesRes.data as { sucursales: SucursalItem[] }).sucursales
      : [];

  const puestos =
    puestosRes.success && puestosRes.data
      ? (puestosRes.data as { puestos: PuestoItem[] }).puestos
      : [];

  return (
    <div className="p-2 pr-4 pb-10">
      <h1 className="text-2xl font-bold mb-6">Empleados</h1>
      <EmpleadosManager
        empleados={empleadosData.empleados}
        sucursales={sucursales}
        puestos={puestos}
      />
    </div>
  );
}
