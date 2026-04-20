import Link from "next/link";
import { getEmpleadoById } from "@/actions/empleado.actions";
import { ArrowLeft, Clock, User, Briefcase, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleEmpleadoEstadoButton } from "./toggle-estado-button";

interface Empleado {
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
}

function formatCRC(value: string | number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
  }).format(Number(value));
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("es-CR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const estadoBadge: Record<string, string> = {
  activo:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactivo:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  licencia:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default async function EmpleadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getEmpleadoById(id);

  if (!result.success || !result.data) {
    return (
      <div className="p-2">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard/empleados">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Empleado no encontrado</h1>
        </div>
        <p className="text-muted-foreground">
          No se pudo cargar la información del empleado.
        </p>
      </div>
    );
  }

  const { empleado, sucursalNombre, puestoNombre } = result.data as {
    empleado: Empleado;
    sucursalNombre: string;
    puestoNombre: string;
  };

  return (
    <div className="p-2 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard/empleados">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {empleado.nombre} {empleado.apellidos}
            </h1>
            <p className="text-muted-foreground text-sm">
              {puestoNombre} — {sucursalNombre}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToggleEmpleadoEstadoButton
            empleadoId={empleado.id}
            estado={empleado.estado}
            nombre={`${empleado.nombre} ${empleado.apellidos}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{empleado.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Apellidos</p>
                <p className="font-medium">{empleado.apellidos}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cédula</p>
                <p className="font-medium">{empleado.cedula}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{empleado.telefono ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Fecha de nacimiento
                </p>
                <p className="font-medium">
                  {formatDate(empleado.fechaNacimiento)}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Dirección</p>
              <p className="font-medium">{empleado.direccion ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" />
              Datos Laborales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sucursal</p>
                <p className="font-medium">{sucursalNombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Puesto</p>
                <p className="font-medium">{puestoNombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Fecha de ingreso
                </p>
                <p className="font-medium">
                  {formatDate(empleado.fechaIngreso)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salario base</p>
                <p className="font-medium">
                  {formatCRC(empleado.salarioBase)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de jornada</p>
                <p className="font-medium capitalize">{empleado.tipoJornada}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas jornada</p>
                <p className="font-medium">
                  {empleado.horasJornada ?? "—"} hrs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Horario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Hora de entrada</p>
                <p className="font-medium text-lg">
                  {empleado.horaEntrada ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hora de salida</p>
                <p className="font-medium text-lg">
                  {empleado.horaSalida ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Acceso al Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">PIN</p>
              {empleado.pin ? (
                <p className="font-mono text-2xl tracking-[0.3em] bg-muted px-4 py-2 rounded-md inline-block">
                  {empleado.pin}
                </p>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge
                  variant={empleado.estado === "activo" ? "default" : "secondary"}
                  className={estadoBadge[empleado.estado]}
                >
                  {empleado.estado}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID de usuario</p>
                <p className="font-mono text-sm">
                  {empleado.userId ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
