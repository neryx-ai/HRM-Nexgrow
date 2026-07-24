"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  TreePalm,
  Trash2,
  CalendarOff,
  Inbox,
  Briefcase,
  Stethoscope,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  solicitarVacacion,
  aprobarRechazarVacacion,
  crearFeriado,
  cancelarSolicitudVacacion,
} from "@/actions/vacacion.actions";
import { eliminarFeriado } from "@/actions/feriados.actions";
import {
  solicitarDiaPersonal,
  aprobarRechazarSolicitudPersonal,
} from "@/actions/asistencia.actions";
import { SolicitarVacacionSchema, CrearFeriadoSchema } from "@/lib/validations/vacacion";
import type { SolicitarVacacionData, CrearFeriadoData } from "@/lib/validations/vacacion";

// ── Tipos unificados ─────────────────────────────────────────────────────────

type TipoSolicitud = "vacacion" | "dia_libre" | "permiso" | "incapacidad";

interface SolicitudVacacionItem {
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
  aprobadoPorNombre?: string | null;
}

interface SolicitudPersonalItem {
  solicitud: {
    id: string;
    empleadoId: string;
    tipo: TipoSolicitud;
    fechaInicio: string;
    fechaFin: string;
    diasHabiles: number;
    motivo: string | null;
    estado: string;
    aprobadaPor: string | null;
    aprobadaEn: Date | null;
    notaResolucion: string | null;
    createdAt: Date;
  };
  empleadoNombre?: string;
  empleadoApellidos?: string;
  aprobadoPorNombre?: string | null;
}

interface SolicitudUnificada {
  id: string;
  origen: "vacacion" | "personal";
  tipo: "vacacion" | "dia_libre" | "permiso" | "incapacidad";
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  estado: string;
  motivo: string | null;
  motivoRechazo: string | null;
  notaResolucion: string | null;
  aprobadoPorNombre: string | null;
  empleadoNombre: string;
  empleadoApellidos: string;
  createdAt: Date;
  raw: SolicitudVacacionItem["solicitud"] | SolicitudPersonalItem["solicitud"];
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

interface VacacionesManagerProps {
  vacaciones: SolicitudVacacionItem[];
  personales: SolicitudPersonalItem[];
  saldos: SaldoItem[];
  feriados: FeriadoItem[];
  esEmpleado: boolean;
}

type Tab = "solicitudes" | "feriados";
type FiltroTipo = "todas" | "vacacion" | "dia_libre" | "permiso" | "incapacidad";

const TIPO_LABEL: Record<TipoSolicitud, string> = {
  vacacion: "Vacación",
  dia_libre: "Día libre",
  permiso: "Permiso",
  incapacidad: "Incapacidad",
};

const TIPO_ICON: Record<TipoSolicitud, React.ComponentType<{ className?: string }>> = {
  vacacion: TreePalm,
  dia_libre: Sun,
  permiso: Briefcase,
  incapacidad: Stethoscope,
};

const TIPO_VARIANT: Record<TipoSolicitud, "default" | "secondary" | "outline" | "destructive"> = {
  vacacion: "default",
  dia_libre: "secondary",
  permiso: "outline",
  incapacidad: "destructive",
};

function unificar(
  vacaciones: SolicitudVacacionItem[],
  personales: SolicitudPersonalItem[],
): SolicitudUnificada[] {
  const map = new Map<string, SolicitudUnificada>();

  for (const v of vacaciones) {
    const key = `v-${v.solicitud.id}`;
    map.set(key, {
      id: v.solicitud.id,
      origen: "vacacion",
      tipo: "vacacion",
      fechaInicio: v.solicitud.fechaInicio,
      fechaFin: v.solicitud.fechaFin,
      diasHabiles: v.solicitud.diasHabiles,
      estado: v.solicitud.estado,
      motivo: v.solicitud.nota,
      motivoRechazo: v.solicitud.motivoRechazo,
      notaResolucion: null,
      aprobadoPorNombre: v.aprobadoPorNombre ?? null,
      empleadoNombre: v.empleadoNombre ?? "",
      empleadoApellidos: v.empleadoApellidos ?? "",
      createdAt: v.solicitud.createdAt,
      raw: v.solicitud,
    });
  }

  for (const p of personales) {
    const key = `p-${p.solicitud.id}`;
    map.set(key, {
      id: p.solicitud.id,
      origen: "personal",
      tipo: p.solicitud.tipo,
      fechaInicio: p.solicitud.fechaInicio,
      fechaFin: p.solicitud.fechaFin,
      diasHabiles: p.solicitud.diasHabiles,
      estado: p.solicitud.estado,
      motivo: p.solicitud.motivo,
      motivoRechazo: null,
      notaResolucion: p.solicitud.notaResolucion,
      aprobadoPorNombre: p.aprobadoPorNombre ?? null,
      empleadoNombre: p.empleadoNombre ?? "",
      empleadoApellidos: p.empleadoApellidos ?? "",
      createdAt: p.solicitud.createdAt,
      raw: p.solicitud,
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; className: string }> = {
    pendiente: {
      label: "Pendiente",
      variant: "secondary",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    aprobada: {
      label: "Aprobada",
      variant: "default",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    rechazada: {
      label: "Rechazada",
      variant: "destructive",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    cancelada: {
      label: "Cancelada",
      variant: "secondary",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
  };

  const c = config[estado] || config.pendiente;

  return (
    <Badge variant={c.variant} className={c.className}>
      {c.label}
    </Badge>
  );
}

function TipoBadge({ tipo }: { tipo: TipoSolicitud }) {
  const Icon = TIPO_ICON[tipo];
  return (
    <Badge variant={TIPO_VARIANT[tipo]} className="gap-1 capitalize">
      <Icon className="size-3" />
      {TIPO_LABEL[tipo]}
    </Badge>
  );
}

export function VacacionesManager({
  vacaciones,
  personales,
  saldos,
  feriados,
  esEmpleado,
}: VacacionesManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("solicitudes");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isFeriadoOpen, setIsFeriadoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobarTarget, setAprobarTarget] = useState<SolicitudUnificada | null>(null);
  const [rechazarTarget, setRechazarTarget] = useState<SolicitudUnificada | null>(null);
  const [cancelarTarget, setCancelarTarget] = useState<SolicitudUnificada | null>(null);
  const [eliminarFeriadoTarget, setEliminarFeriadoTarget] = useState<FeriadoItem | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const saldoActual = saldos[0];

  const solicitudes = useMemo(
    () => unificar(vacaciones, personales),
    [vacaciones, personales],
  );

  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroTipo !== "todas" && s.tipo !== filtroTipo) return false;
    if (filtroEstado === "todos") return true;
    if (filtroEstado === "pendientes") return s.estado === "pendiente";
    return s.estado === filtroEstado;
  });

  // Totales para el encabezado (empleado)
  const totalesEmpleado = useMemo(() => {
    return {
      pendientes: solicitudes.filter((s) => s.estado === "pendiente").length,
      aprobadas: solicitudes.filter((s) => s.estado === "aprobada").length,
      rechazadas: solicitudes.filter((s) => s.estado === "rechazada").length,
    };
  }, [solicitudes]);

  const requestForm = useForm<SolicitarVacacionData>({
    resolver: valibotResolver(SolicitarVacacionSchema),
    defaultValues: {
      fechaInicio: "",
      fechaFin: "",
      nota: undefined,
    },
  });

  const feriadoForm = useForm({
    resolver: valibotResolver(CrearFeriadoSchema),
    defaultValues: {
      fecha: "",
      nombre: "",
      tipo: "nacional",
    } as CrearFeriadoData,
  });

  async function handleAprobar() {
    if (!aprobarTarget) return;
    setIsSubmitting(true);
    const res =
      aprobarTarget.origen === "vacacion"
        ? await aprobarRechazarVacacion({
            solicitudId: aprobarTarget.id,
            accion: "aprobar",
          })
        : await aprobarRechazarSolicitudPersonal({
            solicitudId: aprobarTarget.id,
            accion: "aprobar",
            notaResolucion: motivoRechazo || undefined,
          });
    if (res.success) {
      toast.success("Aprobada", { description: res.message });
      setAprobarTarget(null);
      setMotivoRechazo("");
      router.refresh();
    } else {
      toast.error("Error", { description: res.message });
    }
    setIsSubmitting(false);
  }

  async function handleRechazar() {
    if (!rechazarTarget) return;
    setIsSubmitting(true);
    const res =
      rechazarTarget.origen === "vacacion"
        ? await aprobarRechazarVacacion({
            solicitudId: rechazarTarget.id,
            accion: "rechazar",
            motivoRechazo: motivoRechazo || undefined,
          })
        : await aprobarRechazarSolicitudPersonal({
            solicitudId: rechazarTarget.id,
            accion: "rechazar",
            notaResolucion: motivoRechazo || undefined,
          });
    if (res.success) {
      toast.success("Rechazada", { description: res.message });
      setRechazarTarget(null);
      setMotivoRechazo("");
      router.refresh();
    } else {
      toast.error("Error", { description: res.message });
    }
    setIsSubmitting(false);
  }

  async function handleCancelar() {
    if (!cancelarTarget) return;
    setIsSubmitting(true);
    const res =
      cancelarTarget.origen === "vacacion"
        ? await cancelarSolicitudVacacion(cancelarTarget.id)
        : // Para solicitudes personales, no hay acción de cancelar explícita
          // se actualiza a cancelada directamente vía aprobarRechazarSolicitudPersonal
          // con una acción "cancelar" alternativa. En MVP simplemente se informa.
          {
            success: false,
            message: "Para cancelar solicitudes personales, RRHH debe rechazarla.",
            data: {},
          };
    if (res.success) {
      toast.success("Cancelada", { description: res.message });
      setCancelarTarget(null);
      router.refresh();
    } else {
      toast.error("Error", { description: res.message });
    }
    setIsSubmitting(false);
  }

  async function handleCrearFeriado(data: Record<string, unknown>) {
    const payload = data as CrearFeriadoData;
    setIsSubmitting(true);
    const res = await crearFeriado(payload);
    if (res.success) {
      toast.success("Feriado creado", { description: res.message });
      setIsFeriadoOpen(false);
      feriadoForm.reset();
      router.refresh();
    } else {
      toast.error("Error", { description: res.message });
    }
    setIsSubmitting(false);
  }

  async function handleEliminarFeriado() {
    if (!eliminarFeriadoTarget) return;
    setIsSubmitting(true);
    const res = await eliminarFeriado(eliminarFeriadoTarget.id);
    if (res.success) {
      toast.success("Feriado eliminado", { description: res.message });
      setEliminarFeriadoTarget(null);
      router.refresh();
    } else {
      toast.error("Error", { description: res.message });
    }
    setIsSubmitting(false);
  }

  function formatDate(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
    return d.toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <>
      {esEmpleado && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <TreePalm className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Días disponibles</p>
                  <p className="text-2xl font-bold">
                    {saldoActual?.diasDisponibles || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">{totalesEmpleado.pendientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <CheckCircle2 className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aprobadas</p>
                  <p className="text-2xl font-bold">{totalesEmpleado.aprobadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <CalendarDays className="size-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Días usados</p>
                  <p className="text-2xl font-bold">
                    {saldoActual?.diasUsados || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {esEmpleado && saldoActual && (
        <p className="text-sm text-muted-foreground mb-4">
          Período: {formatDate(saldoActual.periodoInicio)} —{" "}
          {formatDate(saldoActual.periodoFin)} | Otorgados:{" "}
          {saldoActual.diasOtorgados}
        </p>
      )}

      {!esEmpleado && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={activeTab === "solicitudes" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("solicitudes")}
          >
            <Inbox className="size-4" />
            Solicitudes
            {solicitudes.filter((s) => s.estado === "pendiente").length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {solicitudes.filter((s) => s.estado === "pendiente").length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "feriados" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("feriados")}
          >
            <CalendarOff className="size-4" />
            Feriados
          </Button>
        </div>
      )}

      {activeTab === "solicitudes" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={filtroTipo}
                  onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}
                >
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todos los tipos</SelectItem>
                    <SelectItem value="vacacion">Vacaciones</SelectItem>
                    <SelectItem value="dia_libre">Días libres</SelectItem>
                    <SelectItem value="permiso">Permisos</SelectItem>
                    <SelectItem value="incapacidad">Incapacidades</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="pendientes">Pendientes</SelectItem>
                    <SelectItem value="aprobada">Aprobadas</SelectItem>
                    <SelectItem value="rechazada">Rechazadas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {esEmpleado && (
                <Button onClick={() => setIsRequestOpen(true)}>
                  <Plus />
                  Nueva solicitud
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  {!esEmpleado && <TableHead>Empleado</TableHead>}
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días hábiles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Motivo</TableHead>
                  {!esEmpleado && <TableHead>Resuelta por</TableHead>}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={esEmpleado ? 7 : 9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No se encontraron solicitudes.
                    </TableCell>
                  </TableRow>
                ) : (
                  solicitudesFiltradas.map((item) => (
                    <TableRow key={`${item.origen}-${item.id}`}>
                      <TableCell>
                        <TipoBadge tipo={item.tipo} />
                      </TableCell>
                      {!esEmpleado && (
                        <TableCell className="font-medium">
                          {item.empleadoNombre} {item.empleadoApellidos}
                        </TableCell>
                      )}
                      <TableCell>{formatDate(item.fechaInicio)}</TableCell>
                      <TableCell>{formatDate(item.fechaFin)}</TableCell>
                      <TableCell>{item.diasHabiles}</TableCell>
                      <TableCell>
                        <EstadoBadge estado={item.estado} />
                      </TableCell>
                      <TableCell className="max-w-50 truncate text-xs text-muted-foreground">
                        {item.motivoRechazo
                          ? `Rechazo: ${item.motivoRechazo}`
                          : item.notaResolucion
                            ? `Resolución: ${item.notaResolucion}`
                            : item.motivo ?? "—"}
                      </TableCell>
                      {!esEmpleado && (
                        <TableCell>{item.aprobadoPorNombre || "—"}</TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!esEmpleado && item.estado === "pendiente" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Aprobar"
                                onClick={() => setAprobarTarget(item)}
                              >
                                <CheckCircle2 className="size-4 text-emerald-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Rechazar"
                                onClick={() => setRechazarTarget(item)}
                              >
                                <XCircle className="size-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {esEmpleado &&
                            item.origen === "vacacion" &&
                            item.estado === "pendiente" && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Cancelar"
                                onClick={() => setCancelarTarget(item)}
                              >
                                <XCircle className="size-4 text-muted-foreground" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "feriados" && !esEmpleado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Feriados</CardTitle>
              <Button onClick={() => setIsFeriadoOpen(true)}>
                <Plus />
                Nuevo Feriado
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feriados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No hay feriados registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  feriados.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{formatDate(f.fecha)}</TableCell>
                      <TableCell className="font-medium">{f.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {f.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={f.activo ? "default" : "secondary"}
                          className={
                            f.activo
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {f.activo ? "activo" : "inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEliminarFeriadoTarget(f)}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SolicitudDialog
        open={isRequestOpen}
        onOpenChange={setIsRequestOpen}
        form={requestForm}
        isSubmitting={isSubmitting}
        onSubmitVacacion={async (data) => {
          const res = await solicitarVacacion(data);
          if (res.success) {
            toast.success("Solicitud enviada", { description: res.message });
            setIsRequestOpen(false);
            requestForm.reset();
            router.refresh();
          } else {
            toast.error("Error", { description: res.message });
          }
        }}
        onSubmitPersonal={async (payload) => {
          const res = await solicitarDiaPersonal(payload);
          if (res.success) {
            toast.success("Solicitud enviada", { description: res.message });
            setIsRequestOpen(false);
            requestForm.reset();
            router.refresh();
          } else {
            toast.error("Error", { description: res.message });
          }
        }}
      />

      <Dialog open={isFeriadoOpen} onOpenChange={setIsFeriadoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Feriado</DialogTitle>
            <DialogDescription>
              Agregá un feriado al calendario. Se excluyen del cálculo de días hábiles.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={feriadoForm.handleSubmit(handleCrearFeriado)}>
            <FieldGroup>
              <Controller
                name="fecha"
                control={feriadoForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="feriado-fecha">Fecha</FieldLabel>
                    <Input
                      id="feriado-fecha"
                      type="date"
                      required
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="nombre"
                control={feriadoForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="feriado-nombre">Nombre</FieldLabel>
                    <Input
                      id="feriado-nombre"
                      type="text"
                      placeholder="Nombre del feriado"
                      required
                      {...field}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="tipo"
                control={feriadoForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="feriado-tipo">Tipo</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="feriado-tipo"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">Nacional</SelectItem>
                        <SelectItem value="religioso">Religioso</SelectItem>
                        <SelectItem value="opcional">Opcional</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">
                        {fieldState.error.message}
                      </p>
                    )}
                  </Field>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFeriadoOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creando..." : "Crear Feriado"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!aprobarTarget}
        onOpenChange={(open) => !open && setAprobarTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprobar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Aprobar la solicitud de{" "}
              <strong>{TIPO_LABEL[aprobarTarget?.tipo ?? "vacacion"]}</strong> de{" "}
              {aprobarTarget?.empleadoNombre} {aprobarTarget?.empleadoApellidos} del{" "}
              {aprobarTarget && formatDate(aprobarTarget.fechaInicio)} al{" "}
              {aprobarTarget && formatDate(aprobarTarget.fechaFin)} (
              {aprobarTarget?.diasHabiles} días hábiles)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAprobar} disabled={isSubmitting}>
              {isSubmitting ? "Procesando..." : "Aprobar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!rechazarTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRechazarTarget(null);
            setMotivoRechazo("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Vas a rechazar la solicitud de{" "}
              <strong>{TIPO_LABEL[rechazarTarget?.tipo ?? "vacacion"]}</strong> de{" "}
              {rechazarTarget?.empleadoNombre} {rechazarTarget?.empleadoApellidos} (
              {rechazarTarget?.diasHabiles} días hábiles).
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="motivo-rechazo">Motivo del rechazo</FieldLabel>
              <Textarea
                id="motivo-rechazo"
                placeholder="Explicá por qué se rechaza..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRechazarTarget(null);
                  setMotivoRechazo("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRechazar}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Procesando..." : "Rechazar"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!cancelarTarget}
        onOpenChange={(open) => !open && setCancelarTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar tu solicitud de{" "}
              <strong>{TIPO_LABEL[cancelarTarget?.tipo ?? "vacacion"]}</strong> del{" "}
              {cancelarTarget && formatDate(cancelarTarget.fechaInicio)} al{" "}
              {cancelarTarget && formatDate(cancelarTarget.fechaFin)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelar} disabled={isSubmitting}>
              {isSubmitting ? "Procesando..." : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!eliminarFeriadoTarget}
        onOpenChange={(open) => !open && setEliminarFeriadoTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Feriado</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el feriado &quot;{eliminarFeriadoTarget?.nombre}&quot; del{" "}
              {eliminarFeriadoTarget && formatDate(eliminarFeriadoTarget.fecha)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarFeriado}
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Diálogo unificado de nueva solicitud ────────────────────────────────────

interface SolicitudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof useForm<SolicitarVacacionData>>;
  isSubmitting: boolean;
  onSubmitVacacion: (data: SolicitarVacacionData) => Promise<void>;
  onSubmitPersonal: (data: {
    tipo: "dia_libre" | "permiso" | "incapacidad";
    fechaInicio: string;
    fechaFin: string;
    motivo: string | undefined;
  }) => Promise<void>;
}

function SolicitudDialog({
  open,
  onOpenChange,
  form,
  isSubmitting,
  onSubmitVacacion,
  onSubmitPersonal,
}: SolicitudDialogProps) {
  const [tipo, setTipo] = useState<TipoSolicitud>("vacacion");

  const enviar = form.handleSubmit(async (data) => {
    if (tipo === "vacacion") {
      await onSubmitVacacion(data);
    } else {
      await onSubmitPersonal({
        tipo: tipo as "dia_libre" | "permiso" | "incapacidad",
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        motivo: data.nota,
      });
    }
  });

  const Icon = TIPO_ICON[tipo];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-4" /> Nueva solicitud
          </DialogTitle>
          <DialogDescription>
            RRHH recibirá tu solicitud y la aprobará o rechazará. Las vacaciones
            consumen tu saldo disponible; los demás tipos no.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar}>
          <FieldGroup>
            <Field>
              <FieldLabel>Tipo de solicitud</FieldLabel>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoSolicitud)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacacion">
                    <div className="flex items-center gap-2">
                      <TreePalm className="size-4" /> Vacación
                    </div>
                  </SelectItem>
                  <SelectItem value="dia_libre">
                    <div className="flex items-center gap-2">
                      <Sun className="size-4" /> Día libre
                    </div>
                  </SelectItem>
                  <SelectItem value="permiso">
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-4" /> Permiso
                    </div>
                  </SelectItem>
                  <SelectItem value="incapacidad">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="size-4" /> Incapacidad
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Controller
              name="fechaInicio"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="req-fecha-inicio">Fecha inicio</FieldLabel>
                  <Input
                    id="req-fecha-inicio"
                    type="date"
                    required
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </Field>
              )}
            />
            <Controller
              name="fechaFin"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="req-fecha-fin">Fecha fin</FieldLabel>
                  <Input
                    id="req-fecha-fin"
                    type="date"
                    required
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </Field>
              )}
            />
            <Controller
              name="nota"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="req-nota">Motivo / nota (opcional)</FieldLabel>
                  <Textarea
                    id="req-nota"
                    placeholder={
                      tipo === "vacacion"
                        ? "Motivo o comentario..."
                        : "Describí brevemente el motivo."
                    }
                    {...field}
                    value={field.value ?? ""}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </Field>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
