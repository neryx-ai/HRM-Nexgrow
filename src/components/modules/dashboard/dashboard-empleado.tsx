"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  CalendarDays,
  Clock,
  TreePalm,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardEmpleado } from "@/actions/dashboard.actions";

function fmtCRC(n: string | number) {
  return parseFloat(String(n)).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtTime(date: Date | string | null) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const estadoVacacionVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pendiente: "outline",
  aprobada: "default",
  rechazada: "destructive",
};

export function DashboardEmpleado() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await getDashboardEmpleado();
      if (result.success && result.data) {
        setData(result.data as Record<string, unknown>);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-muted-foreground">
        No se pudo cargar la información del dashboard.
      </p>
    );
  }

  const emp = data.empleado as {
    nombre: string;
    apellidos: string;
    cedula: string;
    telefono: string | null;
    fechaIngreso: string;
    sucursalNombre: string | null;
    puestoNombre: string | null;
    pin: string | null;
    estado: string;
  };
  const asistenciaReciente = data.asistenciaReciente as {
    fecha: string;
    horasOrdinarias: string;
    horasExtra: string;
    ausente: boolean;
    retraso: boolean;
    minutosRetraso: string;
    horaEntrada: string | null;
    horaSalida: string | null;
  }[];
  const saldoVacaciones = data.saldoVacaciones as {
    diasDisponibles: number;
    diasUsados: number;
    diasOtorgados: number;
    diasPendientes: number;
  } | null;
  const solicitudesVacacion = data.solicitudesVacacion as {
    fechaInicio: string;
    fechaFin: string;
    diasHabiles: number;
    estado: string;
  }[];
  const ultimasColillas = data.ultimasColillas as {
    planillaId: string;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    salarioBruto: string;
    totalDeduccionesLegales: string;
    totalDeduccionesAdicionales: string;
    salarioNeto: string;
  }[];

  const nombreCompleto = `${emp.nombre} ${emp.apellidos}`;

  return (
    <div className="space-y-6 p-2 pr-4 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{nombreCompleto}</h2>
          <p className="text-muted-foreground">
            {emp.puestoNombre || "Sin puesto"} —{" "}
            {emp.sucursalNombre || "Sin sucursal"}
          </p>
        </div>
        <Badge
          variant={emp.estado === "activo" ? "default" : "destructive"}
          className="text-sm"
        >
          {emp.estado === "activo" ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Datos personales</CardDescription>
            <User className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Cédula:</span>{" "}
              {emp.cedula}
            </p>
            {emp.telefono && (
              <p>
                <span className="text-muted-foreground">Teléfono:</span>{" "}
                {emp.telefono}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Ingreso:</span>{" "}
              {emp.fechaIngreso}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Mi PIN de acceso</CardDescription>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={() => setShowPin(!showPin)}
            >
              {showPin ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {showPin ? (
              <p className="text-3xl font-mono font-bold tracking-widest">
                {emp.pin || "—"}
              </p>
            ) : (
              <p className="text-3xl font-mono tracking-widest text-muted-foreground">
                ••••••
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Usá este PIN en el quiosco para marcar asistencia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Saldo de vacaciones</CardDescription>
            <TreePalm className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {saldoVacaciones ? (
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {saldoVacaciones.diasDisponibles} días
                </p>
                <p className="text-xs text-muted-foreground">
                  Otorgados: {saldoVacaciones.diasOtorgados} | Usados:{" "}
                  {saldoVacaciones.diasUsados}
                  {saldoVacaciones.diasPendientes > 0 &&
                    ` | Pendientes: ${saldoVacaciones.diasPendientes}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin saldo registrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Asistencia reciente
            </CardTitle>
            <CardDescription>Últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asistenciaReciente.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Sin registros recientes
                    </TableCell>
                  </TableRow>
                ) : (
                  asistenciaReciente.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{a.fecha}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {fmtTime(a.horaEntrada)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {fmtTime(a.horaSalida)}
                      </TableCell>
                      <TableCell>
                        {a.ausente ? (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="size-3 mr-1" />
                            Ausente
                          </Badge>
                        ) : a.retraso ? (
                          <Badge variant="outline" className="text-xs">
                            <AlertTriangle className="size-3 mr-1" />
                            Retraso
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="size-3 mr-1" />
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Últimas colillas
            </CardTitle>
            <CardDescription>Planillas procesadas</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Ded.</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimasColillas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Sin colillas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  ultimasColillas.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">
                        {c.fechaInicio} — {c.fechaFin}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ¢{fmtCRC(c.salarioBruto)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">
                        ¢
                        {fmtCRC(
                          (
                            parseFloat(c.totalDeduccionesLegales) +
                            parseFloat(c.totalDeduccionesAdicionales)
                          ).toString(),
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        ¢{fmtCRC(c.salarioNeto)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {solicitudesVacacion.length > 0 && (
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              Mis solicitudes de vacaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesVacacion.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.fechaInicio}</TableCell>
                    <TableCell>{s.fechaFin}</TableCell>
                    <TableCell>{s.diasHabiles}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          estadoVacacionVariant[s.estado] || "secondary"
                        }
                      >
                        {s.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/dashboard/asistencia">
            <Clock className="size-5" />
            <span>Mi asistencia</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/dashboard/vacations">
            <TreePalm className="size-5" />
            <span>Mis vacaciones</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/dashboard/profile">
            <User className="size-5" />
            <span>Mi perfil</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
