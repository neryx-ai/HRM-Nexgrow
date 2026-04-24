"use client";

import { useState } from "react";
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
  eliminarFeriado,
  cancelarSolicitudVacacion,
} from "@/actions/vacacion.actions";
import {
  SolicitarVacacionSchema,
  CrearFeriadoSchema,
} from "@/lib/validations/vacacion";
import type { SolicitarVacacionData, CrearFeriadoData } from "@/lib/validations/vacacion";

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

interface VacacionesManagerProps {
  solicitudes: SolicitudItem[];
  saldos: SaldoItem[];
  feriados: FeriadoItem[];
  esEmpleado: boolean;
}

type Tab = "solicitudes" | "feriados";

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

export function VacacionesManager({
  solicitudes,
  saldos,
  feriados,
  esEmpleado,
}: VacacionesManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("solicitudes");
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isFeriadoOpen, setIsFeriadoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobarTarget, setAprobarTarget] = useState<SolicitudItem | null>(null);
  const [rechazarTarget, setRechazarTarget] = useState<SolicitudItem | null>(null);
  const [cancelarTarget, setCancelarTarget] = useState<SolicitudItem | null>(null);
  const [eliminarFeriadoTarget, setEliminarFeriadoTarget] = useState<FeriadoItem | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const saldoActual = saldos[0];

  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroEstado === "todos") return true;
    if (filtroEstado === "pendientes") return s.solicitud.estado === "pendiente";
    return s.solicitud.estado === filtroEstado;
  });

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

  async function handleRequest(data: SolicitarVacacionData) {
    setIsSubmitting(true);
    const res = await solicitarVacacion(data);
    if (res.success) {
      toast.success("Solicitud enviada", { description: res.message });
      setIsRequestOpen(false);
      requestForm.reset();
      router.refresh();
    } else {
      toast.error("Error", { description: res.message });
    }
    setIsSubmitting(false);
  }

  async function handleAprobar() {
    if (!aprobarTarget) return;
    setIsSubmitting(true);
    const res = await aprobarRechazarVacacion({
      solicitudId: aprobarTarget.solicitud.id,
      accion: "aprobar",
    });
    if (res.success) {
      toast.success("Aprobada", { description: res.message });
      setAprobarTarget(null);
      router.refresh();
    } else {
      toast.error("Error", { description: res.message });
    }
    setIsSubmitting(false);
  }

  async function handleRechazar() {
    if (!rechazarTarget) return;
    setIsSubmitting(true);
    const res = await aprobarRechazarVacacion({
      solicitudId: rechazarTarget.solicitud.id,
      accion: "rechazar",
      motivoRechazo: motivoRechazo || undefined,
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
    const res = await cancelarSolicitudVacacion(cancelarTarget.solicitud.id);
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
      {esEmpleado && saldoActual && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <TreePalm className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disponibles</p>
                  <p className="text-2xl font-bold">{saldoActual.diasDisponibles}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Clock className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">{saldoActual.diasPendientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <CalendarDays className="size-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usados</p>
                  <p className="text-2xl font-bold">{saldoActual.diasUsados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {esEmpleado && saldoActual && (
        <p className="text-sm text-muted-foreground mb-4">
          Período: {formatDate(saldoActual.periodoInicio)} — {formatDate(saldoActual.periodoFin)} | Días otorgados: {saldoActual.diasOtorgados}
        </p>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={activeTab === "solicitudes" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("solicitudes")}
        >
          <CalendarDays className="size-4" />
          Solicitudes
        </Button>
        {!esEmpleado && (
          <Button
            variant={activeTab === "feriados" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("feriados")}
          >
            <CalendarOff className="size-4" />
            Feriados
          </Button>
        )}
      </div>

      {activeTab === "solicitudes" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
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
                  Solicitar Vacación
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {!esEmpleado && <TableHead>Empleado</TableHead>}
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días hábiles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Nota</TableHead>
                  {!esEmpleado && <TableHead>Aprobado por</TableHead>}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={esEmpleado ? 6 : 8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No se encontraron solicitudes.
                    </TableCell>
                  </TableRow>
                ) : (
                  solicitudesFiltradas.map((item) => (
                    <TableRow key={item.solicitud.id}>
                      {!esEmpleado && (
                        <TableCell className="font-medium">
                          {item.empleadoNombre} {item.empleadoApellidos}
                        </TableCell>
                      )}
                      <TableCell>{formatDate(item.solicitud.fechaInicio)}</TableCell>
                      <TableCell>{formatDate(item.solicitud.fechaFin)}</TableCell>
                      <TableCell>{item.solicitud.diasHabiles}</TableCell>
                      <TableCell>
                        <EstadoBadge estado={item.solicitud.estado} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.solicitud.nota || "—"}
                      </TableCell>
                      {!esEmpleado && (
                        <TableCell>
                          {item.aprobadoPorNombre || "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!esEmpleado && item.solicitud.estado === "pendiente" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setAprobarTarget(item)}
                              >
                                <CheckCircle2 className="size-4 text-emerald-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setRechazarTarget(item)}
                              >
                                <XCircle className="size-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {esEmpleado && item.solicitud.estado === "pendiente" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
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
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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

      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Vacación</DialogTitle>
            <DialogDescription>
              Seleccioná el rango de fechas para tu solicitud. Solo se cuentan días hábiles.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={requestForm.handleSubmit(handleRequest)}>
            <FieldGroup>
              <Controller
                name="fechaInicio"
                control={requestForm.control}
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
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="fechaFin"
                control={requestForm.control}
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
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name="nota"
                control={requestForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="req-nota">Nota (opcional)</FieldLabel>
                    <Textarea
                      id="req-nota"
                      placeholder="Motivo o comentario..."
                      {...field}
                      value={field.value ?? ""}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
                    )}
                  </Field>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestOpen(false)}
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
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
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
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
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
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="feriado-tipo" aria-invalid={fieldState.invalid}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">Nacional</SelectItem>
                        <SelectItem value="religioso">Religioso</SelectItem>
                        <SelectItem value="opcional">Opcional</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-destructive text-sm">{fieldState.error.message}</p>
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
            <AlertDialogTitle>Aprobar Solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Aprobar la vacación de{" "}
              {aprobarTarget?.empleadoNombre} {aprobarTarget?.empleadoApellidos} del{" "}
              {aprobarTarget && formatDate(aprobarTarget.solicitud.fechaInicio)} al{" "}
              {aprobarTarget && formatDate(aprobarTarget.solicitud.fechaFin)} (
              {aprobarTarget?.solicitud.diasHabiles} días hábiles)?
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
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              Rechazar la vacación de{" "}
              {rechazarTarget?.empleadoNombre} {rechazarTarget?.empleadoApellidos} (
              {rechazarTarget?.solicitud.diasHabiles} días hábiles).
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
            <AlertDialogTitle>Cancelar Solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar tu solicitud de vacación del{" "}
              {cancelarTarget && formatDate(cancelarTarget.solicitud.fechaInicio)} al{" "}
              {cancelarTarget && formatDate(cancelarTarget.solicitud.fechaFin)}?
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
