"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getMetricasAsistencia,
  getNotificacionesGeo,
  resolverNotificacionGeo,
} from "@/actions/asistencia.actions";

interface SucursalItem {
  id: string;
  nombre: string;
}

interface EmpleadoItem {
  id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
}

interface CandidatoDeduccion {
  empleadoId: string;
  empleadoNombre: string;
  empleadoCedula: string;
  fecha: string;
  tipoCandidato: "retraso" | "ausencia" | "horas-faltantes";
  descripcion: string;
  minutosRetraso?: number;
  horasFaltantes?: number;
  planillaSugeridaId: string | null;
}

interface ResumenMetricas {
  totalRegistros: number;
  totalAusencias: number;
  totalRetrasos: number;
  totalHorasOrdinarias: string;
  totalHorasExtra: string;
  promedioRetrasoMinutos: string;
}

interface RegistroMetrica {
  resumen: {
    id: string;
    empleadoId: string;
    fecha: string;
    tieneEntrada: boolean;
    tieneSalida: boolean;
    horaEntrada: Date | null;
    horaSalida: Date | null;
    retraso: boolean;
    minutosRetraso: string;
    horasOrdinarias: string;
    horasExtra: string;
    ausente: boolean;
  };
  empleadoId: string;
  empleadoNombre: string;
  empleadoApellidos: string;
  empleadoCedula: string;
  sucursalId: string | null;
  sucursalNombre: string | null;
}

interface Props {
  fechaInicio: string;
  fechaFin: string;
  sucursales: SucursalItem[];
  empleados: EmpleadoItem[];
  metricasIniciales?: object;
}

interface NotificacionGeo {
  notificacion: {
    id: string;
    distanciaM: number;
    accion: string | null;
    nota: string | null;
    createdAt: Date;
  };
  empleadoNombre: string;
  empleadoApellidos: string;
  empleadoCedula: string;
  sucursalNombre: string;
  registroTipo: string;
  registroTimestamp: Date;
  registroLat: number | null;
  registroLng: number | null;
  registroPrecision: number | null;
  registroFuente: string;
}

export function MetricasAsistencia({
  fechaInicio: fechaInicioInicial,
  fechaFin: fechaFinInicial,
  sucursales,
  empleados,
  metricasIniciales,
}: Props) {
  const [fechaInicio, setFechaInicio] = useState(fechaInicioInicial);
  const [fechaFin, setFechaFin] = useState(fechaFinInicial);
  const [sucursalId, setSucursalId] = useState("");
  const [empleadoSearch, setEmpleadoSearch] = useState("");
  const [metricas, setMetricas] = useState<
    | (ResumenMetricas & {
        registros: RegistroMetrica[];
        candidatos: CandidatoDeduccion[];
      })
    | null
  >((metricasIniciales as never) ?? null);
  const [notificaciones, setNotificaciones] = useState<NotificacionGeo[]>([]);
  const [isPending, startTransition] = useTransition();

  const cargar = () => {
    startTransition(async () => {
      const res = await getMetricasAsistencia({
        fechaInicio,
        fechaFin,
        sucursalId: sucursalId || undefined,
        empleadoSearch: empleadoSearch.trim() || undefined,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setMetricas(res.data as never);
      const notifRes = await getNotificacionesGeo(fechaInicio, fechaFin);
      if (notifRes.success) {
        setNotificaciones(
          (notifRes.data as { notificaciones?: NotificacionGeo[] })
            ?.notificaciones ?? [],
        );
      }
    });
  };

  const resolver = (
    id: string,
    accion: "justificar" | "descontar" | "ignorar",
  ) => {
    startTransition(async () => {
      const res = await resolverNotificacionGeo({ notificacionId: id, accion });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Notificación resuelta");
      cargar();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sucursal</label>
              <Select
                value={sucursalId || "todas"}
                onValueChange={(v) => setSucursalId(v === "todas" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Empleado</label>
              <div className="relative">
                <Search className="size-4 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Nombre o cédula"
                  className="pl-8"
                  value={empleadoSearch}
                  onChange={(e) => setEmpleadoSearch(e.target.value)}
                  list="empleados-list"
                />
                <datalist id="empleados-list">
                  {empleados.map((e) => (
                    <option
                      key={e.id}
                      value={`${e.nombre} ${e.apellidos} - ${e.cedula}`}
                    />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={cargar} disabled={isPending} className="w-full">
                {isPending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  "Aplicar filtros"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {metricas && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="text-2xl font-bold">{metricas.totalRegistros}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Ausencias</p>
                <p className="text-2xl font-bold text-red-600">
                  {metricas.totalAusencias}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Retrasos</p>
                <p className="text-2xl font-bold text-amber-600">
                  {metricas.totalRetrasos}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Horas extra</p>
                <p className="text-2xl font-bold">
                  {parseFloat(metricas.totalHorasExtra || "0").toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalle diario</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrosTable registros={metricas.registros} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidatos a deducción</CardTitle>
            </CardHeader>
            <CardContent>
              <CandidatosTable candidatos={metricas.candidatos} />
            </CardContent>
          </Card>
        </>
      )}

      {notificaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones fuera de geocerca</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificacionesTable
              notificaciones={notificaciones}
              onResolver={resolver}
              isPending={isPending}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RegistrosTable({ registros }: { registros: RegistroMetrica[] }) {
  if (registros.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin registros en el rango.</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Empleado</TableHead>
          <TableHead>Sucursal</TableHead>
          <TableHead>Entrada</TableHead>
          <TableHead>Salida</TableHead>
          <TableHead>Horas</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {registros.map((r) => (
          <TableRow key={r.resumen.id}>
            <TableCell>{r.resumen.fecha}</TableCell>
            <TableCell>
              {r.empleadoNombre} {r.empleadoApellidos}
              <span className="block text-xs text-muted-foreground">
                {r.empleadoCedula}
              </span>
            </TableCell>
            <TableCell>{r.sucursalNombre ?? "—"}</TableCell>
            <TableCell>
              {r.resumen.horaEntrada
                ? new Date(r.resumen.horaEntrada).toLocaleTimeString("es-CR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </TableCell>
            <TableCell>
              {r.resumen.horaSalida
                ? new Date(r.resumen.horaSalida).toLocaleTimeString("es-CR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </TableCell>
            <TableCell>
              {parseFloat(r.resumen.horasOrdinarias || "0").toFixed(2)}h
              {parseFloat(r.resumen.horasExtra || "0") > 0 && (
                <span className="text-xs text-blue-600">
                  {" "}
                  (+{parseFloat(r.resumen.horasExtra).toFixed(2)}h extra)
                </span>
              )}
            </TableCell>
            <TableCell>
              {r.resumen.ausente ? (
                <Badge variant="destructive">Ausente</Badge>
              ) : r.resumen.retraso ? (
                <Badge variant="secondary">
                  Retraso {parseFloat(r.resumen.minutosRetraso).toFixed(0)}m
                </Badge>
              ) : (
                <Badge variant="default">Puntual</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CandidatosTable({
  candidatos,
}: {
  candidatos: CandidatoDeduccion[];
}) {
  if (candidatos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin candidatos en el rango seleccionado.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empleado</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Detalle</TableHead>
          <TableHead>Planilla borrador</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidatos.map((c, idx) => (
          <TableRow key={`${c.empleadoId}-${c.fecha}-${idx}`}>
            <TableCell>
              {c.empleadoNombre}
              <span className="block text-xs text-muted-foreground">
                {c.empleadoCedula}
              </span>
            </TableCell>
            <TableCell>{c.fecha}</TableCell>
            <TableCell>
              {c.tipoCandidato === "retraso" && (
                <Badge variant="secondary">Retraso</Badge>
              )}
              {c.tipoCandidato === "ausencia" && (
                <Badge variant="destructive">Ausencia</Badge>
              )}
              {c.tipoCandidato === "horas-faltantes" && (
                <Badge variant="outline">Horas faltantes</Badge>
              )}
            </TableCell>
            <TableCell className="text-sm">{c.descripcion}</TableCell>
            <TableCell>
              {c.planillaSugeridaId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/payroll/${c.planillaSugeridaId}`}>
                    <ExternalLink className="mr-1 size-3" />
                    Ir a planilla
                  </Link>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Sin planilla abierta
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function NotificacionesTable({
  notificaciones,
  onResolver,
  isPending,
}: {
  notificaciones: NotificacionGeo[];
  onResolver: (
    id: string,
    accion: "justificar" | "descontar" | "ignorar",
  ) => void;
  isPending: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empleado</TableHead>
          <TableHead>Sucursal</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Distancia</TableHead>
          <TableHead>Coords</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notificaciones.map((n) => (
          <TableRow key={n.notificacion.id}>
            <TableCell>
              {n.empleadoNombre} {n.empleadoApellidos}
              <span className="block text-xs text-muted-foreground">
                {n.empleadoCedula}
              </span>
            </TableCell>
            <TableCell>{n.sucursalNombre}</TableCell>
            <TableCell>
              {new Date(n.registroTimestamp).toLocaleString("es-CR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </TableCell>
            <TableCell>{n.notificacion.distanciaM} m</TableCell>
            <TableCell className="text-xs">
              {n.registroLat != null && n.registroLng != null
                ? `${n.registroLat.toFixed(4)}, ${n.registroLng.toFixed(4)} (±${(n.registroPrecision ?? 0).toFixed(0)}m)`
                : "—"}
            </TableCell>
            <TableCell className="space-x-1">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onResolver(n.notificacion.id, "justificar")}
              >
                Justificar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => onResolver(n.notificacion.id, "descontar")}
              >
                Descontar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => onResolver(n.notificacion.id, "ignorar")}
              >
                Ignorar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
