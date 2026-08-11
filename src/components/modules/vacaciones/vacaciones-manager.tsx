"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import {
  TreePalm,
  Search,
  CalendarDays,
  Plus,
  Pencil,
  History,
  Users,
  TrendingUp,
  TrendingDown,
  Mail,
  CalendarOff,
  Download,
  Loader2,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  getResumenSaldo,
  getEmpleadosConSaldo,
  getHistorialMovimientos,
  otorgarVacacion,
  ajustarSaldo,
  calcularDiasHabilesAction,
  generarBoletaVacacion,
  reenviarBoletaEmail,
} from "@/actions/saldo-vacacion.actions";
import {
  OtorgarVacacionSchema,
  type OtorgarVacacionData,
} from "@/lib/validations/saldo-vacacion";
import { AjusteSaldoSchema, type AjusteSaldoData } from "@/lib/validations/saldo-vacacion";

interface EmpleadoConSaldo {
  empleadoId: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  sucursalNombre: string | null;
  puestoNombre: string | null;
  fechaIngreso: string;
  diasDevengados: number;
  totalOtorgamientos: number;
  totalAjustesPositivos: number;
  totalAjustesNegativos: number;
  diasDisponibles: number;
  estado: string;
}

interface Movimiento {
  id: string;
  empleadoId: string;
  tipo: "otorgamiento" | "ajuste_positivo" | "ajuste_negativo" | "devengo";
  dias: number;
  motivo: string;
  realizadoPor: string;
  realizadoPorNombre: string | null;
  fecha: string;
  metadata: unknown;
}

interface ResumenSaldo {
  diasDevengados: number;
  totalOtorgamientos: number;
  totalAjustesPositivos: number;
  totalAjustesNegativos: number;
  diasDisponibles: number;
  diasOtorgados: number;
  diasUsados: number;
}

interface EmpleadoBasico {
  id: string;
  nombre: string;
  apellidos: string;
  cedula: string;
  email: string | null;
  sucursalNombre: string | null;
  puestoNombre: string | null;
  fechaIngreso: string;
}

interface VacacionesManagerProps {
  rol: "admin" | "rrhh" | "empleado";
  empleadoActual: EmpleadoBasico | null;
}

const TIPO_LABELS: Record<Movimiento["tipo"], string> = {
  otorgamiento: "Otorgamiento",
  ajuste_positivo: "Ajuste (+)",
  ajuste_negativo: "Ajuste (−)",
  devengo: "Devengo",
};

const TIPO_VARIANT: Record<
  Movimiento["tipo"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  otorgamiento: "default",
  ajuste_positivo: "secondary",
  ajuste_negativo: "destructive",
  devengo: "outline",
};

function getTipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo as Movimiento["tipo"]] ?? tipo;
}

function getTipoVariant(
  tipo: string,
): "default" | "secondary" | "destructive" | "outline" {
  return TIPO_VARIANT[tipo as Movimiento["tipo"]] ?? "outline";
}

function fmtFecha(s: string) {
  if (!s) return "—";
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
    return s;
  }
}

function fmtFechaHora(s: string) {
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
    return s;
  }
}

export function VacacionesManager({ rol, empleadoActual }: VacacionesManagerProps) {
  const esAdmin = rol === "admin" || rol === "rrhh";

  const [empleados, setEmpleados] = useState<EmpleadoConSaldo[]>([]);
  const [resumenPropio, setResumenPropio] = useState<ResumenSaldo | null>(null);
  const [movimientosPropios, setMovimientosPropios] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [otorgarOpen, setOtorgarOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [empleadoSelOtorgar, setEmpleadoSelOtorgar] = useState<EmpleadoConSaldo | null>(null);
  const [empleadoSelHistorial, setEmpleadoSelHistorial] = useState<EmpleadoConSaldo | null>(null);
  const [historialEmpleado, setHistorialEmpleado] = useState<Movimiento[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  async function loadData() {
    setLoading(true);
    if (esAdmin) {
      const res = await getEmpleadosConSaldo({
        busqueda: busqueda || undefined,
      });
      if (res.success) {
        setEmpleados((res.data as { empleados: EmpleadoConSaldo[] }).empleados);
      }
    } else if (empleadoActual) {
      const resResumen = await getResumenSaldo({ empleadoId: empleadoActual.id });
      if (resResumen.success) {
        const data = resResumen.data as {
          resumen: ResumenSaldo;
          empleado: EmpleadoBasico | null;
        };
        setResumenPropio(data.resumen);
      }
      const resMov = await getHistorialMovimientos({ empleadoId: empleadoActual.id });
      if (resMov.success) {
        setMovimientosPropios(
          (resMov.data as { movimientos: Movimiento[] }).movimientos,
        );
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, empleadoActual?.id]);

  useEffect(() => {
    if (!esAdmin) return;
    const t = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  async function cargarHistorial(emp: EmpleadoConSaldo) {
    setEmpleadoSelHistorial(emp);
    setLoadingHistorial(true);
    const res = await getHistorialMovimientos({ empleadoId: emp.empleadoId });
    if (res.success) {
      setHistorialEmpleado(
        (res.data as { movimientos: Movimiento[] }).movimientos,
      );
    }
    setLoadingHistorial(false);
  }

  const empleadosFiltrados = useMemo(() => {
    if (!busqueda) return empleados;
    const b = busqueda.toLowerCase();
    return empleados.filter(
      (e) =>
        `${e.nombre} ${e.apellidos}`.toLowerCase().includes(b) ||
        e.cedula.toLowerCase().includes(b),
    );
  }, [empleados, busqueda]);

  if (!esAdmin && !empleadoActual) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            No se encontró un perfil de empleado asociado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {esAdmin ? (
        <VistaAdmin
          empleados={empleadosFiltrados}
          loading={loading}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          onOtorgar={() => {
            setEmpleadoSelOtorgar(null);
            setOtorgarOpen(true);
          }}
          onAjustar={(emp) => {
            setEmpleadoSelOtorgar(emp);
            setAjusteOpen(true);
          }}
          onVerHistorial={cargarHistorial}
          onOtorgarEmpleado={(emp) => {
            setEmpleadoSelOtorgar(emp);
            setOtorgarOpen(true);
          }}
        />
      ) : (
        <VistaEmpleado
          empleado={empleadoActual!}
          resumen={resumenPropio}
          movimientos={movimientosPropios}
          loading={loading}
        />
      )}

      <OtorgarVacacionDialog
        open={otorgarOpen}
        empleado={empleadoSelOtorgar}
        onOpenChange={(o) => {
          setOtorgarOpen(o);
          if (!o) setEmpleadoSelOtorgar(null);
        }}
        onSuccess={() => {
          setOtorgarOpen(false);
          setEmpleadoSelOtorgar(null);
          loadData();
          if (empleadoSelHistorial) cargarHistorial(empleadoSelHistorial);
        }}
      />

      <AjustarSaldoDialog
        open={ajusteOpen}
        empleado={empleadoSelOtorgar}
        onOpenChange={(o) => {
          setAjusteOpen(o);
          if (!o) setEmpleadoSelOtorgar(null);
        }}
        onSuccess={() => {
          setAjusteOpen(false);
          setEmpleadoSelOtorgar(null);
          loadData();
        }}
      />

      <HistorialSheet
        open={!!empleadoSelHistorial}
        onOpenChange={(o) => {
          if (!o) setEmpleadoSelHistorial(null);
        }}
        empleado={empleadoSelHistorial}
        movimientos={historialEmpleado}
        loading={loadingHistorial}
        esAdmin={esAdmin}
        onMovimientoChange={() => {
          if (empleadoSelHistorial) cargarHistorial(empleadoSelHistorial);
        }}
      />
    </div>
  );
}

// ── Vista Admin ───────────────────────────────────────────────────────────────

function VistaAdmin({
  empleados,
  loading,
  busqueda,
  setBusqueda,
  onOtorgar,
  onAjustar,
  onVerHistorial,
  onOtorgarEmpleado,
}: {
  empleados: EmpleadoConSaldo[];
  loading: boolean;
  busqueda: string;
  setBusqueda: (s: string) => void;
  onOtorgar: () => void;
  onAjustar: (emp: EmpleadoConSaldo) => void;
  onVerHistorial: (emp: EmpleadoConSaldo) => void;
  onOtorgarEmpleado: (emp: EmpleadoConSaldo) => void;
}) {
  const totalEmpleados = empleados.length;
  const totalDisponibles = empleados.reduce((acc, e) => acc + e.diasDisponibles, 0);
  const totalDevengados = empleados.reduce((acc, e) => acc + e.diasDevengados, 0);

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-heading">Vacaciones</h1>
          <p className="text-muted-foreground text-sm">
            Gestioná los saldos de vacaciones de tus empleados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onOtorgar}>
            <Plus className="size-4" />
            Otorgar vacaciones
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empleados activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalEmpleados}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total devengado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-blue-600" />
              <span className="text-2xl font-bold">{totalDevengados}</span>
              <span className="text-sm text-muted-foreground">días</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TreePalm className="size-5 text-emerald-600" />
              <span className="text-2xl font-bold">{totalDisponibles}</span>
              <span className="text-sm text-muted-foreground">días</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Saldos por empleado</CardTitle>
              <CardDescription>
                Hacé clic en una fila para ver el historial completo.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o cédula..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : empleados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay empleados para mostrar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Devengados</TableHead>
                  <TableHead className="text-right">Otorgados</TableHead>
                  <TableHead className="text-right">Ajustes +/-</TableHead>
                  <TableHead className="text-right">Disponibles</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.map((emp) => (
                  <TableRow key={emp.empleadoId}>
                    <TableCell>
                      <div className="font-medium">
                        {emp.nombre} {emp.apellidos}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {emp.cedula} · Ingreso {fmtFecha(emp.fechaIngreso)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.sucursalNombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {emp.diasDevengados}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Math.abs(emp.totalOtorgamientos)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-emerald-600">
                        +{emp.totalAjustesPositivos}
                      </span>
                      {" / "}
                      <span className="text-red-600">
                        {emp.totalAjustesNegativos}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          emp.diasDisponibles <= 0
                            ? "destructive"
                            : emp.diasDisponibles <= 5
                              ? "secondary"
                              : "default"
                        }
                        className="tabular-nums"
                      >
                        {emp.diasDisponibles}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onOtorgarEmpleado(emp)}
                          title="Otorgar vacaciones"
                        >
                          <Plus className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onAjustar(emp)}
                          title="Ajustar saldo"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onVerHistorial(emp)}
                          title="Ver historial"
                        >
                          <History className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Vista Empleado ────────────────────────────────────────────────────────────

function VistaEmpleado({
  empleado,
  resumen,
  movimientos,
  loading,
}: {
  empleado: EmpleadoBasico;
  resumen: ResumenSaldo | null;
  movimientos: Movimiento[];
  loading: boolean;
}) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold font-heading">Mis vacaciones</h1>
        <p className="text-muted-foreground text-sm">
          {empleado.nombre} {empleado.apellidos} · {empleado.puestoNombre ?? "—"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Días devengados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-blue-600" />
              <span className="text-3xl font-bold tabular-nums">
                {resumen?.diasDevengados ?? 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              1 por cada mes desde tu ingreso (
              {fmtFecha(empleado.fechaIngreso)}).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Días otorgados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarOff className="size-5 text-amber-600" />
              <span className="text-3xl font-bold tabular-nums">
                {resumen?.diasUsados ?? 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Días que ya tomaste.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ajustes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="size-4 text-emerald-600" />
                <span className="text-lg font-semibold tabular-nums">
                  {resumen?.totalAjustesPositivos ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="size-4 text-red-600" />
                <span className="text-lg font-semibold tabular-nums">
                  {resumen?.totalAjustesNegativos ?? 0}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cambios aplicados por RRHH.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Saldo disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TreePalm className="size-5 text-emerald-600" />
              <span className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {resumen?.diasDisponibles ?? 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Días que podés tomar.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de movimientos</CardTitle>
          <CardDescription>
            Todos los cambios registrados sobre tu saldo de vacaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay movimientos registrados todavía.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {fmtFechaHora(m.fecha)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTipoVariant(m.tipo)}>
                        {getTipoLabel(m.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={
                          m.dias > 0
                            ? "text-emerald-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {m.dias > 0 ? "+" : ""}
                        {m.dias}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{m.motivo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.realizadoPorNombre ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Otorgar Vacacion Dialog ──────────────────────────────────────────────────

function OtorgarVacacionDialog({
  open,
  empleado,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  empleado: EmpleadoConSaldo | null;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [diasCalculados, setDiasCalculados] = useState<number | null>(null);

  const form = useForm<OtorgarVacacionData>({
    resolver: valibotResolver(OtorgarVacacionSchema),
    defaultValues: {
      empleadoId: empleado?.empleadoId ?? "",
      fechaInicio: "",
      fechaFin: "",
      motivo: "",
      enviarNotificacion: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        empleadoId: empleado?.empleadoId ?? "",
        fechaInicio: "",
        fechaFin: "",
        motivo: "",
        enviarNotificacion: true,
      });
      setDiasCalculados(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empleado?.empleadoId]);

  const fechaInicio = form.watch("fechaInicio");
  const fechaFin = form.watch("fechaFin");

  useEffect(() => {
    if (fechaInicio && fechaFin && fechaFin >= fechaInicio) {
      calcularDiasHabilesAction({ fechaInicio, fechaFin }).then((res) => {
        if (res.success) {
          setDiasCalculados((res.data as { dias: number }).dias);
        }
      });
    } else {
      setDiasCalculados(null);
    }
  }, [fechaInicio, fechaFin]);

  const onSubmit = async (data: OtorgarVacacionData) => {
    setSubmitting(true);
    const res = await otorgarVacacion(data);
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message);
      onSuccess();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Otorgar vacaciones</DialogTitle>
          <DialogDescription>
            {empleado
              ? `Otorgar vacaciones a ${empleado.nombre} ${empleado.apellidos} (saldo actual: ${empleado.diasDisponibles} días).`
              : "Elegí un empleado y registrá las vacaciones."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {!empleado && (
            <Field>
              <FieldLabel>Empleado</FieldLabel>
              <Controller
                control={form.control}
                name="empleadoId"
                render={({ field }) => (
                  <EmpleadoSelect
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
          )}
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
          {diasCalculados !== null ? (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                empleado && diasCalculados > empleado.diasDisponibles
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-border bg-muted/40"
              }`}
            >
              <span className="font-medium">{diasCalculados} día(s) hábiles</span>
              <span className="text-muted-foreground">
                {" "}
                — calculado automáticamente (excluye S-D y feriados).
              </span>
              {empleado && diasCalculados > empleado.diasDisponibles && (
                <p className="text-xs mt-1">
                  El empleado solo tiene {empleado.diasDisponibles} día(s)
                  disponibles. Reducí el rango o ajustá el saldo primero.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ingresá las fechas para ver el cálculo de días hábiles.
            </p>
          )}
          <Field>
            <FieldLabel>Motivo / nota</FieldLabel>
            <Textarea
              {...form.register("motivo")}
              placeholder="Ej. Vacaciones de medio año"
              rows={2}
            />
          </Field>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enviarNotificacion"
              {...form.register("enviarNotificacion")}
              className="size-4"
            />
            <label
              htmlFor="enviarNotificacion"
              className="text-sm flex items-center gap-2"
            >
              <Mail className="size-4" />
              Enviar notificación por email al empleado
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Otorgando..." : "Otorgar vacaciones"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Ajustar Saldo Dialog ─────────────────────────────────────────────────────

function AjustarSaldoDialog({
  open,
  empleado,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  empleado: EmpleadoConSaldo | null;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AjusteSaldoData>({
    resolver: valibotResolver(AjusteSaldoSchema),
    defaultValues: {
      empleadoId: empleado?.empleadoId ?? "",
      dias: 0,
      motivo: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        empleadoId: empleado?.empleadoId ?? "",
        dias: 0,
        motivo: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empleado?.empleadoId]);

  const onSubmit = async (data: AjusteSaldoData) => {
    setSubmitting(true);
    const res = await ajustarSaldo(data);
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message);
      onSuccess();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar saldo</DialogTitle>
          <DialogDescription>
            {empleado
              ? `Ajustar saldo de ${empleado.nombre} ${empleado.apellidos} (saldo actual: ${empleado.diasDisponibles} días).`
              : "—"}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel>Días (positivo o negativo)</FieldLabel>
            <Input
              type="number"
              {...form.register("dias", { valueAsNumber: true })}
              placeholder="Ej. 5 o -3"
            />
            <p className="text-xs text-muted-foreground">
              Positivo suma días, negativo descuenta (usado para correcciones de
              histórico).
            </p>
          </Field>
          <Field>
            <FieldLabel>Motivo (obligatorio)</FieldLabel>
            <Textarea
              {...form.register("motivo")}
              placeholder="Ej. Corrección de histórico por instalación del sistema"
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
              {submitting ? "Aplicando..." : "Aplicar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Historial Sheet ───────────────────────────────────────────────────────────

function HistorialSheet({
  open,
  onOpenChange,
  empleado,
  movimientos,
  loading,
  esAdmin,
  onMovimientoChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empleado: EmpleadoConSaldo | null;
  movimientos: Movimiento[];
  loading: boolean;
  esAdmin: boolean;
  onMovimientoChange: () => void;
}) {
  const [accionPorId, setAccionPorId] = useState<Record<string, "pdf" | "email">>(
    {},
  );

  async function handleDescargar(movimientoId: string) {
    setAccionPorId((p) => ({ ...p, [movimientoId]: "pdf" }));
    const res = await generarBoletaVacacion({ movimientoId });
    setAccionPorId((p) => {
      const next = { ...p };
      delete next[movimientoId];
      return next;
    });
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    const data = res.data as {
      base64: string;
      filename: string;
      contentType: string;
    };
    try {
      const byteChars = atob(data.base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        bytes[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Boleta descargada");
    } catch {
      toast.error("No se pudo descargar la boleta");
    }
  }

  async function handleReenviarEmail(movimientoId: string) {
    setAccionPorId((p) => ({ ...p, [movimientoId]: "email" }));
    const res = await reenviarBoletaEmail({ movimientoId });
    setAccionPorId((p) => {
      const next = { ...p };
      delete next[movimientoId];
      return next;
    });
    if (res.success) {
      toast.success(res.message);
      onMovimientoChange();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {empleado
              ? `${empleado.nombre} ${empleado.apellidos}`
              : "Historial"}
          </SheetTitle>
          <SheetDescription>
            {empleado
              ? `Saldo actual: ${empleado.diasDisponibles} días · Devengados: ${empleado.diasDevengados}`
              : ""}
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay movimientos registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {movimientos.map((m) => {
              const accion = accionPorId[m.id];
              const isOtorgamiento = m.tipo === "otorgamiento";
              return (
                <Card key={m.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={getTipoVariant(m.tipo)}>
                        {getTipoLabel(m.tipo)}
                      </Badge>
                      <span
                        className={`text-xl font-bold tabular-nums ${m.dias > 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {m.dias > 0 ? "+" : ""}
                        {m.dias} días
                      </span>
                    </div>
                    <p className="text-sm">{m.motivo}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{fmtFechaHora(m.fecha)}</span>
                      <span>{m.realizadoPorNombre ?? "—"}</span>
                    </div>
                    {isOtorgamiento && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDescargar(m.id)}
                          disabled={!!accion}
                        >
                          {accion === "pdf" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          Descargar boleta
                        </Button>
                        {esAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReenviarEmail(m.id)}
                            disabled={!!accion}
                          >
                            {accion === "email" ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Mail className="size-4" />
                            )}
                            Reenviar por email
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Helper: Empleado Select ───────────────────────────────────────────────────

function EmpleadoSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [empleados, setEmpleados] = useState<EmpleadoConSaldo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getEmpleadosConSaldo().then((res) => {
      if (res.success) {
        setEmpleados((res.data as { empleados: EmpleadoConSaldo[] }).empleados);
      }
      setLoading(false);
    });
  }, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={loading}>
      <SelectTrigger>
        <SelectValue
          placeholder={loading ? "Cargando..." : "Seleccionar empleado"}
        />
      </SelectTrigger>
      <SelectContent>
        {empleados.map((e) => (
          <SelectItem key={e.empleadoId} value={e.empleadoId}>
            {e.nombre} {e.apellidos} · {e.cedula} (saldo: {e.diasDisponibles})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
