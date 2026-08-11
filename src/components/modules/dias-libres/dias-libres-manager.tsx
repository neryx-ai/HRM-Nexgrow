"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import {
  CalendarOff,
  Plus,
  Check,
  X,
  Clock,
  Briefcase,
  Stethoscope,
  Search,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getMisSolicitudes,
  getSolicitudesPersonal,
  solicitarDiaPersonal,
  aprobarRechazarSolicitudPersonal,
} from "@/actions/asistencia.actions";
import {
  SolicitudPersonalSchema,
} from "@/lib/validations/asistencia";

type SolicitudFormData = {
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  motivo?: string;
  adjuntoUrl?: string;
};

type TipoSolicitud = "dia_libre" | "permiso" | "incapacidad";
type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada" | "cancelada";

interface Solicitud {
  id: string;
  empleadoId: string;
  empleadoNombre?: string;
  empleadoApellidos?: string;
  empleadoCedula?: string;
  sucursalNombre?: string;
  tipo: TipoSolicitud;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  motivo: string | null;
  estado: EstadoSolicitud;
  aprobadaPor: string | null;
  aprobadaEn: string | null;
  notaResolucion: string | null;
  createdAt: string | Date;
}

const TIPO_LABELS: Record<TipoSolicitud, string> = {
  dia_libre: "Día libre",
  permiso: "Permiso",
  incapacidad: "Incapacidad",
};

const TIPO_ICONS: Record<TipoSolicitud, React.ComponentType<{ className?: string }>> = {
  dia_libre: CalendarOff,
  permiso: Briefcase,
  incapacidad: Stethoscope,
};

function getTipoIcon(tipo: string): React.ComponentType<{ className?: string }> {
  return TIPO_ICONS[tipo as TipoSolicitud] ?? CalendarOff;
}

const ESTADO_LABELS: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

const ESTADO_VARIANT: Record<
  EstadoSolicitud,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pendiente: "secondary",
  aprobada: "default",
  rechazada: "destructive",
  cancelada: "outline",
};

function getEstadoVariant(
  estado: string,
): "default" | "secondary" | "destructive" | "outline" {
  return ESTADO_VARIANT[estado as EstadoSolicitud] ?? "outline";
}

function getEstadoLabel(estado: string): string {
  return ESTADO_LABELS[estado as EstadoSolicitud] ?? estado;
}

function fmtFecha(s: string | Date) {
  if (!s) return "—";
  if (s instanceof Date) {
    return s.toLocaleDateString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  try {
    return new Date(s).toLocaleDateString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return String(s);
  }
}

function fmtFechaHora(s: string | Date | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(s);
  }
}

type RawSolicitud =
  | Solicitud
  | {
      solicitud: {
        id: string;
        empleadoId: string;
        tipo: string;
        fechaInicio: string;
        fechaFin: string;
        diasHabiles: number;
        motivo: string | null;
        estado: string;
        aprobadaPor: string | null;
        aprobadaEn: string | null;
        notaResolucion: string | null;
        createdAt: string | Date;
      };
      empleadoNombre?: string;
      empleadoApellidos?: string;
      empleadoCedula?: string;
      sucursalNombre?: string;
    };

function normalizarSolicitud(raw: RawSolicitud): Solicitud {
  const isNested = "solicitud" in raw && raw.solicitud;
  if (isNested) {
    const s = raw.solicitud;
    return {
      id: s.id,
      empleadoId: s.empleadoId,
      empleadoNombre: raw.empleadoNombre,
      empleadoApellidos: raw.empleadoApellidos,
      empleadoCedula: raw.empleadoCedula,
      sucursalNombre: raw.sucursalNombre,
      tipo: s.tipo as TipoSolicitud,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      diasHabiles: s.diasHabiles,
      motivo: s.motivo,
      estado: s.estado as EstadoSolicitud,
      aprobadaPor: s.aprobadaPor,
      aprobadaEn: s.aprobadaEn,
      notaResolucion: s.notaResolucion,
      createdAt: s.createdAt,
    };
  }
  return raw as Solicitud;
}

interface DiasLibresManagerProps {
  rol: "admin" | "rrhh" | "empleado";
}

export function DiasLibresManager({ rol }: DiasLibresManagerProps) {
  const esAdmin = rol === "admin" || rol === "rrhh";

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<"todas" | EstadoSolicitud>("todas");
  const [busqueda, setBusqueda] = useState("");

  const [crearOpen, setCrearOpen] = useState(false);
  const [resolverTarget, setResolverTarget] = useState<{
    solicitud: Solicitud;
    accion: "aprobar" | "rechazar";
  } | null>(null);
  const [notaResolucion, setNotaResolucion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    if (esAdmin) {
      const res = await getSolicitudesPersonal();
      if (res.success) {
        const raw = (res.data as { solicitudes: RawSolicitud[] }).solicitudes;
        setSolicitudes(raw.map(normalizarSolicitud));
      }
    } else {
      const res = await getMisSolicitudes();
      if (res.success) {
        const raw = (res.data as { solicitudes: RawSolicitud[] }).solicitudes;
        setSolicitudes(raw.map(normalizarSolicitud));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      if (esAdmin) {
        const res = await getSolicitudesPersonal();
        if (abort.signal.aborted) return;
        if (res.success) {
          const raw = (res.data as { solicitudes: RawSolicitud[] }).solicitudes;
          setSolicitudes(raw.map(normalizarSolicitud));
        }
      } else {
        const res = await getMisSolicitudes();
        if (abort.signal.aborted) return;
        if (res.success) {
          const raw = (res.data as { solicitudes: RawSolicitud[] }).solicitudes;
          setSolicitudes(raw.map(normalizarSolicitud));
        }
      }
      setLoading(false);
    })();
    return () => abort.abort();
  }, [esAdmin]);

  const filtered = useMemo(() => {
    let r = solicitudes;
    if (filtroEstado !== "todas") {
      r = r.filter((s) => s.estado === filtroEstado);
    }
    if (busqueda && esAdmin) {
      const b = busqueda.toLowerCase();
      r = r.filter(
        (s) =>
          `${s.empleadoNombre ?? ""} ${s.empleadoApellidos ?? ""}`
            .toLowerCase()
            .includes(b) ||
          (s.empleadoCedula ?? "").toLowerCase().includes(b),
      );
    }
    return r;
  }, [solicitudes, filtroEstado, busqueda, esAdmin]);

  const counters = useMemo(() => {
    return {
      total: solicitudes.length,
      pendientes: solicitudes.filter((s) => s.estado === "pendiente").length,
      aprobadas: solicitudes.filter((s) => s.estado === "aprobada").length,
      rechazadas: solicitudes.filter((s) => s.estado === "rechazada").length,
    };
  }, [solicitudes]);

  async function handleCrear(data: SolicitudFormData) {
    setSubmitting(true);
    const res = await solicitarDiaPersonal(data);
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message);
      setCrearOpen(false);
      loadData();
    } else {
      toast.error(res.message);
    }
  }

  async function handleResolver() {
    if (!resolverTarget) return;
    setSubmitting(true);
    const res = await aprobarRechazarSolicitudPersonal({
      solicitudId: resolverTarget.solicitud.id,
      accion: resolverTarget.accion,
      notaResolucion: notaResolucion || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message);
      setResolverTarget(null);
      setNotaResolucion("");
      loadData();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading">Días libres</h1>
          <p className="text-muted-foreground text-sm">
            {esAdmin
              ? "Gestioná las solicitudes de días libres, permisos e incapacidades."
              : "Solicitá un día libre, permiso o incapacidad."}
          </p>
        </div>
        <Button onClick={() => setCrearOpen(true)}>
          <Plus className="size-4" />
          Nueva solicitud
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold tabular-nums">
              {counters.total}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-amber-600" />
              <span className="text-2xl font-bold tabular-nums">
                {counters.pendientes}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprobadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="size-5 text-emerald-600" />
              <span className="text-2xl font-bold tabular-nums">
                {counters.aprobadas}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rechazadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <X className="size-5 text-red-600" />
              <span className="text-2xl font-bold tabular-nums">
                {counters.rechazadas}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>
                {esAdmin ? "Solicitudes de todos" : "Mis solicitudes"}
              </CardTitle>
              <CardDescription>
                {esAdmin
                  ? "Aprobá o rechazá las solicitudes de los empleados."
                  : "Acá podés ver el estado de tus solicitudes."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {esAdmin && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8"
                  />
                </div>
              )}
              <Select
                value={filtroEstado}
                onValueChange={(v) =>
                  setFiltroEstado(v as "todas" | EstadoSolicitud)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="aprobada">Aprobadas</SelectItem>
                  <SelectItem value="rechazada">Rechazadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="size-12 mx-auto mb-2 opacity-50" />
              <p>No hay solicitudes para mostrar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {esAdmin && <TableHead>Empleado</TableHead>}
                  <TableHead>Tipo</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead className="text-right">Días hábiles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const Icon = getTipoIcon(s.tipo);
                  return (
                    <TableRow key={s.id}>
                      {esAdmin ? (
                        <TableCell>
                          <div className="font-medium">
                            {s.empleadoNombre} {s.empleadoApellidos}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.empleadoCedula} · {s.sucursalNombre ?? "—"}
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <span>{TIPO_LABELS[s.tipo as TipoSolicitud] ?? s.tipo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {fmtFecha(s.fechaInicio)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fmtFecha(s.fechaFin)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.diasHabiles}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEstadoVariant(s.estado)}>
                          {getEstadoLabel(s.estado)}
                        </Badge>
                        {s.notaResolucion ? (
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            RRHH: {s.notaResolucion}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {s.motivo ?? "—"}
                      </TableCell>
                      {esAdmin ? (
                        <TableCell className="text-right">
                          {s.estado === "pendiente" ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() =>
                                  setResolverTarget({
                                    solicitud: s,
                                    accion: "aprobar",
                                  })
                                }
                                title="Aprobar"
                              >
                                <Check className="size-4 text-emerald-600" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() =>
                                  setResolverTarget({
                                    solicitud: s,
                                    accion: "rechazar",
                                  })
                                }
                                title="Rechazar"
                              >
                                <X className="size-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {fmtFechaHora(s.aprobadaEn)}
                            </span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CrearSolicitudDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        onSubmit={handleCrear}
        submitting={submitting}
      />

      <AlertDialog
        open={!!resolverTarget}
        onOpenChange={(o) => {
          if (!o) {
            setResolverTarget(null);
            setNotaResolucion("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resolverTarget?.accion === "aprobar"
                ? "Aprobar solicitud"
                : "Rechazar solicitud"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resolverTarget?.accion === "aprobar"
                ? "El empleado será notificado por email."
                : "Indicá el motivo del rechazo (opcional pero recomendado)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>Nota de resolución (opcional)</FieldLabel>
              <Textarea
                value={notaResolucion}
                onChange={(e) => setNotaResolucion(e.target.value)}
                rows={3}
                placeholder={
                  resolverTarget?.accion === "aprobar"
                    ? "Ej. Aprobado, disfrutá tu día."
                    : "Ej. No se puede por cobertura del área."
                }
              />
            </Field>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolver}
              disabled={submitting}
              className={
                resolverTarget?.accion === "rechazar"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {resolverTarget?.accion === "aprobar" ? "Aprobar" : "Rechazar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CrearSolicitudDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: SolicitudFormData) => Promise<void>;
  submitting: boolean;
}) {
  const form = useForm<SolicitudFormData>({
    resolver: valibotResolver(SolicitudPersonalSchema),
    defaultValues: {
      tipo: "dia_libre",
      fechaInicio: "",
      fechaFin: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        tipo: "dia_libre",
        fechaInicio: "",
        fechaFin: "",
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva solicitud</DialogTitle>
          <DialogDescription>
            Solicitud de día libre, permiso o incapacidad.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel>Tipo</FieldLabel>
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia_libre">Día libre</SelectItem>
                    <SelectItem value="permiso">Permiso</SelectItem>
                    <SelectItem value="incapacidad">Incapacidad</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Desde</FieldLabel>
              <Input type="date" {...form.register("fechaInicio")} />
            </Field>
            <Field>
              <FieldLabel>Hasta</FieldLabel>
              <Input type="date" {...form.register("fechaFin")} />
            </Field>
          </div>
          <Field>
            <FieldLabel>Motivo (opcional)</FieldLabel>
            <Textarea
              {...form.register("motivo")}
              placeholder="Ej. Cita médica, asunto personal..."
              rows={3}
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
