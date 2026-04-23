"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  CalendarOff,
  FileText,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
  getHistorialAsistencia,
  registrarManual,
  corteAutomatico,
} from "@/actions/asistencia.actions";
import { RegistroManualSchema } from "@/lib/validations/asistencia";
import type { RegistroManualData } from "@/lib/validations/asistencia";

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

interface AsistenciaManagerProps {
  historialInicial: HistorialItem[];
  sucursales: SucursalItem[];
  empleados: EmpleadoItem[];
}

export function AsistenciaManager({
  historialInicial,
  sucursales,
  empleados,
}: AsistenciaManagerProps) {
  const [historial, setHistorial] = useState(historialInicial);
  const [search, setSearch] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [sucursalFilter, setSucursalFilter] = useState<string>("");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCorte, setIsCorte] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: valibotResolver(RegistroManualSchema),
    defaultValues: {
      empleadoId: "",
      tipo: "entrada" as const,
      fecha: new Date().toISOString().split("T")[0],
      hora: undefined,
      nota: undefined,
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await getHistorialAsistencia(
        fechaInicio,
        fechaFin,
        sucursalFilter || undefined,
        search || undefined,
      );
      if (result.success) {
        setHistorial(
          (result.data as { registros: HistorialItem[] })?.registros || [],
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCorteAutomatico = async () => {
    setIsCorte(true);
    try {
      const result = await corteAutomatico();
      if (result.success) {
        toast.success(result.message);
        handleRefresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsCorte(false);
    }
  };

  const onManualSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
    const result = await registrarManual(data);
    if (result.success) {
      toast.success(result.message);
      setIsManualOpen(false);
      reset();
      handleRefresh();
    } else {
      toast.error(result.message);
    }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = historial.filter((item) => {
    const term = search.toLowerCase();
    if (
      term &&
      !item.empleadoNombre.toLowerCase().includes(term) &&
      !item.empleadoApellidos.toLowerCase().includes(term) &&
      !item.empleadoCedula.includes(term)
    ) {
      return false;
    }
    return true;
  });

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (fecha: string) => {
    return new Date(fecha + "T12:00:00").toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatHoras = (horas: string) => {
    const h = parseFloat(horas);
    if (isNaN(h) || h === 0) return "—";
    return `${h.toFixed(1)}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-40"
          />
          <Select value={sucursalFilter} onValueChange={setSucursalFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas las sucursales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <Search className="size-4 mr-1" />
            {isRefreshing ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCorteAutomatico} disabled={isCorte}>
            <Scissors className="size-4 mr-1" />
            {isCorte ? "Procesando..." : "Corte automático"}
          </Button>
          <Button onClick={() => setIsManualOpen(true)}>
            <Plus className="size-4 mr-1" />
            Registro manual
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Historial de Asistencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarOff className="size-12 mx-auto mb-3 opacity-50" />
              <p>No hay registros de asistencia para el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Ordinarias</TableHead>
                    <TableHead>Extra</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.resumen.id}>
                      <TableCell className="font-medium">
                        {formatDate(item.resumen.fecha)}
                      </TableCell>
                      <TableCell>
                        {item.empleadoNombre} {item.empleadoApellidos}
                      </TableCell>
                      <TableCell>{item.empleadoCedula}</TableCell>
                      <TableCell>{item.sucursalNombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.resumen.tieneEntrada ? (
                            <>
                              <LogIn className="size-3.5 text-emerald-500" />
                              {formatTime(item.resumen.horaEntrada)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.resumen.tieneSalida ? (
                            <>
                              <LogOut className="size-3.5 text-blue-500" />
                              {formatTime(item.resumen.horaSalida)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatHoras(item.resumen.horasOrdinarias)}
                      </TableCell>
                      <TableCell>
                        {formatHoras(item.resumen.horasExtra)}
                      </TableCell>
                      <TableCell>
                        {item.resumen.ausente ? (
                          <Badge variant="destructive">Ausente</Badge>
                        ) : item.resumen.retraso ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <AlertTriangle className="size-3 mr-1" />
                            Retraso ({Math.round(parseFloat(item.resumen.minutosRetraso))}min)
                          </Badge>
                        ) : item.resumen.tieneEntrada && item.resumen.tieneSalida ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                            Completo
                          </Badge>
                        ) : item.resumen.tieneEntrada ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            En turno
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sin marcaje</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Registro Manual de Asistencia
            </DialogTitle>
            <DialogDescription>
              Registra ausencias, incapacidades, permisos o marcaciones manuales.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Empleado</FieldLabel>
                <Controller
                  name="empleadoId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná un empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {empleados.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.nombre} {emp.apellidos} — {emp.cedula}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.empleadoId && (
                  <p className="text-sm text-destructive">
                    {errors.empleadoId.message}
                  </p>
                )}
              </Field>

              <Field>
                <FieldLabel>Tipo de registro</FieldLabel>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="salida">Salida</SelectItem>
                        <SelectItem value="ausencia">Ausencia</SelectItem>
                        <SelectItem value="incapacidad">Incapacidad</SelectItem>
                        <SelectItem value="permiso">Permiso</SelectItem>
                        <SelectItem value="vacacion">Vacación</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipo && (
                  <p className="text-sm text-destructive">
                    {errors.tipo.message}
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Fecha</FieldLabel>
                  <Input type="date" {...register("fecha")} />
                  {errors.fecha && (
                    <p className="text-sm text-destructive">
                      {errors.fecha.message}
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Hora (opcional)</FieldLabel>
                  <Input type="time" {...register("hora")} />
                </Field>
              </div>

              <Field>
                <FieldLabel>Nota</FieldLabel>
                <Textarea
                  {...register("nota")}
                  placeholder="Motivo o comentario..."
                  rows={3}
                />
                {errors.nota && (
                  <p className="text-sm text-destructive">
                    {errors.nota.message}
                  </p>
                )}
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsManualOpen(false);
                  reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
