"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  LogIn,
  LogOut,
  MapPin,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGeolocation } from "@/hooks/use-geolocation";
import { marcarAsistencia } from "@/actions/asistencia.actions";
import {
  CONSENTIMIENTO_GEO_DESCRIPCION,
  CONSENTIMIENTO_GEO_DERECHOS,
  CONSENTIMIENTO_GEO_TITULO,
} from "@/lib/legal";

interface EmpleadoResumen {
  id: string;
  nombre: string;
  apellidos: string;
  horaEntrada: string;
  horaSalida: string;
  estado: string;
}

interface SucursalResumen {
  id: string;
  nombre: string;
  geocercaActiva: boolean;
  radioMetros: number;
  latitud: number | null;
  longitud: number | null;
}

interface ResumenHoy {
  id: string;
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
}

interface RegistroAsistencia {
  id: string;
  tipo: string;
  timestamp: Date;
  fuente: string;
  nota: string | null;
  fueraDeGeocerca: boolean;
}

interface SolicitudPersonal {
  id: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  estado: string;
  motivo: string | null;
  notaResolucion: string | null;
  createdAt: Date;
}

interface Props {
  empleado: EmpleadoResumen;
  sucursal: SucursalResumen | null;
  resumenHoy: ResumenHoy | null;
  ultimosRegistros: RegistroAsistencia[];
  solicitudesIniciales: unknown[];
}

export function MiAsistenciaManager({
  empleado,
  sucursal,
  resumenHoy,
  ultimosRegistros,
  solicitudesIniciales,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const geo = useGeolocation({ timeoutMs: 8000 });
  const [showConsent, setShowConsent] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<{
    tipo: "entrada" | "salida";
    hora: string;
    fueraDeGeocerca: boolean;
  } | null>(null);

  const enTurno = resumenHoy?.tieneEntrada && !resumenHoy?.tieneSalida;
  const nombreCompleto = `${empleado.nombre} ${empleado.apellidos}`;

  const handleMarcar = (solicitarGeo: boolean) => {
    if (solicitarGeo && sucursal?.geocercaActiva) {
      setShowConsent(true);
      return;
    }
    ejecutarMarcacion(null);
  };

  const ejecutarMarcacion = (
    coords: {
      lat: number;
      lng: number;
      accuracy: number;
      capturedAt: number;
    } | null,
  ) => {
    startTransition(async () => {
      const res = await marcarAsistencia({
        coords: coords ?? undefined,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      const data = res.data as {
        tipo: "entrada" | "salida";
        hora: string;
        fueraDeGeocerca: boolean;
      };
      setUltimoResultado({
        tipo: data.tipo,
        hora: data.hora,
        fueraDeGeocerca: !!data.fueraDeGeocerca,
      });
      if (data.fueraDeGeocerca) {
        toast.warning(
          "Tu marcación quedó registrada fuera de la geocerca. RRHH la revisará.",
        );
      } else {
        toast.success(res.message);
      }
    });
  };

  const aceptarConsentimiento = () => {
    setShowConsent(false);
    geo.solicitar();
  };

  const continuarSinGeo = () => {
    setShowConsent(false);
    ejecutarMarcacion(null);
  };

  const enviarMarcacionConGeo = () => {
    if (!geo.coords) {
      toast.error("Todavía no tenemos tu ubicación.");
      return;
    }
    ejecutarMarcacion(geo.coords);
    geo.reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Hola, {nombreCompleto}</span>
            <Badge variant={empleado.estado === "activo" ? "default" : "destructive"}>
              {empleado.estado}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resumenHoy ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Estado</p>
                <p className="font-medium">
                  {resumenHoy.ausente
                    ? "Ausente"
                    : enTurno
                      ? "En turno"
                      : resumenHoy.tieneSalida
                        ? "Jornada cerrada"
                        : "Sin marcación"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Entrada</p>
                <p className="font-medium">
                  {resumenHoy.horaEntrada
                    ? new Date(resumenHoy.horaEntrada).toLocaleTimeString(
                        "es-CR",
                        { hour: "2-digit", minute: "2-digit" },
                      )
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Salida</p>
                <p className="font-medium">
                  {resumenHoy.horaSalida
                    ? new Date(resumenHoy.horaSalida).toLocaleTimeString(
                        "es-CR",
                        { hour: "2-digit", minute: "2-digit" },
                      )
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Retraso</p>
                <p className="font-medium">
                  {resumenHoy.retraso
                    ? `${parseFloat(resumenHoy.minutosRetraso).toFixed(0)} min`
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no tenés marcaciones registradas el día de hoy.
            </p>
          )}

          {ultimoResultado?.fueraDeGeocerca && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
              <AlertTriangle className="size-4 mt-0.5 text-amber-600" />
              <div>
                <p className="font-medium">Marcación fuera de geocerca</p>
                <p className="text-muted-foreground">
                  Tu {ultimoResultado.tipo} de las {ultimoResultado.hora} se
                  registró fuera del radio permitido. RRHH la revisará.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="lg"
              disabled={isPending || empleado.estado !== "activo"}
              onClick={() => handleMarcar(true)}
            >
              {enTurno ? (
                <>
                  <LogOut className="mr-2 size-4" /> Marcar salida
                </>
              ) : (
                <>
                  <LogIn className="mr-2 size-4" /> Marcar entrada
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={isPending || empleado.estado !== "activo"}
              onClick={() => handleMarcar(false)}
            >
              Continuar sin ubicación
            </Button>
          </div>

          {sucursal?.geocercaActiva && geo.estado !== "idle" && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4" />
                <span className="font-medium">Ubicación</span>
                {geo.estado === "concedido" && (
                  <Badge variant="secondary">Concedida</Badge>
                )}
                {geo.estado === "denegado" && (
                  <Badge variant="destructive">Denegada</Badge>
                )}
                {geo.estado === "solicitando" && (
                  <Badge>Solicitando…</Badge>
                )}
              </div>
              {geo.mensaje && (
                <p className="text-muted-foreground">{geo.mensaje}</p>
              )}
              {geo.coords && (
                <p className="text-xs text-muted-foreground">
                  Lat: {geo.coords.lat.toFixed(5)}, Lng:{" "}
                  {geo.coords.lng.toFixed(5)} (±
                  {geo.coords.accuracy.toFixed(0)} m)
                </p>
              )}
              {geo.coords && (
                <Button size="sm" onClick={enviarMarcacionConGeo} disabled={isPending}>
                  Registrar con esta ubicación
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mis solicitudes</span>
            <Button asChild size="sm">
              <Link href="/dashboard/vacations">
                <Plus className="mr-1 size-4" /> Nueva
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SolicitudesList
            solicitudes={solicitudesIniciales as SolicitudPersonal[]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Las solicitudes de vacaciones, días libres, permisos e
            incapacidades se gestionan desde el módulo{" "}
            <Link
              href="/dashboard/vacations"
              className="text-primary underline-offset-4 hover:underline"
            >
              Solicitudes
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <HistorialTable registros={ultimosRegistros} />
        </CardContent>
      </Card>

      <ConsentDialog
        open={showConsent}
        onOpenChange={setShowConsent}
        onAceptar={aceptarConsentimiento}
        onContinuarSinGeo={continuarSinGeo}
      />
    </div>
  );
}

function HistorialTable({ registros }: { registros: RegistroAsistencia[] }) {
  if (registros.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin marcaciones en los últimos 7 días.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha y hora</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Fuente</TableHead>
          <TableHead>Geocerca</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {registros.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              {new Date(r.timestamp).toLocaleString("es-CR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </TableCell>
            <TableCell className="capitalize">{r.tipo}</TableCell>
            <TableCell>{r.fuente}</TableCell>
            <TableCell>
              {r.fueraDeGeocerca ? (
                <Badge variant="destructive">Fuera</Badge>
              ) : (
                <Badge variant="secondary">OK</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SolicitudesList({
  solicitudes,
}: {
  solicitudes: SolicitudPersonal[];
}) {
  if (solicitudes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no enviaste solicitudes.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Rango</TableHead>
          <TableHead>Días hábiles</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Nota</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {solicitudes.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="capitalize">
              {s.tipo.replace("_", " ")}
            </TableCell>
            <TableCell>
              {s.fechaInicio} → {s.fechaFin}
            </TableCell>
            <TableCell>{s.diasHabiles}</TableCell>
            <TableCell>
              <Badge
                variant={
                  s.estado === "aprobada"
                    ? "default"
                    : s.estado === "rechazada"
                      ? "destructive"
                      : "secondary"
                }
              >
                {s.estado}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {s.notaResolucion ?? s.motivo ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ConsentDialog({
  open,
  onOpenChange,
  onAceptar,
  onContinuarSinGeo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAceptar: () => void;
  onContinuarSinGeo: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{CONSENTIMIENTO_GEO_TITULO}</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{CONSENTIMIENTO_GEO_DESCRIPCION}</p>
            <p className="text-xs">{CONSENTIMIENTO_GEO_DERECHOS}</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onContinuarSinGeo}>
            Continuar sin ubicación
          </Button>
          <Button onClick={onAceptar}>Aceptar y compartir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
