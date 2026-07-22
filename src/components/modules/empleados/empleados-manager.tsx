"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  Search,
  Power,
  Eye,
  UserPlus,
  Filter,
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
  createEmpleado,
  updateEmpleado,
  toggleEmpleadoEstado,
} from "@/actions/empleado.actions";
import {
  CreateEmpleadoSchema,
  UpdateEmpleadoSchema,
} from "@/lib/validations/empleado";
import type {
  CreateEmpleadoData,
  UpdateEmpleadoData,
} from "@/lib/validations/empleado";

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

interface EmpleadoRow {
  empleado: Empleado;
  sucursalNombre: string;
  puestoNombre: string;
}

interface Sucursal {
  id: string;
  nombre: string;
}

interface Puesto {
  id: string;
  nombre: string;
}

interface EmpleadosManagerProps {
  empleados: EmpleadoRow[];
  sucursales: Sucursal[];
  puestos: Puesto[];
}

function formatCRC(value: string | number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
  }).format(Number(value));
}

const estadoBadge: Record<string, string> = {
  activo:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactivo:
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  licencia:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function EmpleadosManager({
  empleados,
  sucursales,
  puestos,
}: EmpleadosManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterSucursal, setFilterSucursal] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<EmpleadoRow | null>(
    null,
  );
  const [toggleTarget, setToggleTarget] = useState<EmpleadoRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const filtered = empleados.filter((row) => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      row.empleado.nombre.toLowerCase().includes(term) ||
      row.empleado.apellidos.toLowerCase().includes(term) ||
      row.empleado.cedula.toLowerCase().includes(term);
    const matchSucursal =
      filterSucursal === "all" ||
      row.empleado.sucursalId === filterSucursal;
    const matchEstado =
      filterEstado === "all" || row.empleado.estado === filterEstado;
    return matchSearch && matchSucursal && matchEstado;
  });

  const createForm = useForm<CreateEmpleadoData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: valibotResolver(CreateEmpleadoSchema) as any,
    defaultValues: {
      sucursalId: "",
      puestoId: "",
      nombre: "",
      apellidos: "",
      cedula: "",
      email: "",
      telefono: undefined,
      fechaNacimiento: undefined,
      direccion: undefined,
      fechaIngreso: "",
      salarioBase: "" as unknown as undefined,
      tipoJornada: "completa",
      horasJornada: undefined,
      horaEntrada: undefined,
      horaSalida: undefined,
    },
  });

  const editForm = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: valibotResolver(UpdateEmpleadoSchema) as any,
    defaultValues: {
      id: "",
      sucursalId: undefined,
      puestoId: undefined,
      nombre: undefined,
      apellidos: undefined,
      telefono: undefined,
      fechaNacimiento: undefined,
      direccion: undefined,
      fechaIngreso: undefined,
      salarioBase: undefined,
      tipoJornada: undefined,
      horasJornada: undefined,
      horaEntrada: undefined,
      horaSalida: undefined,
    } as UpdateEmpleadoData,
  });

  function openCreate() {
    createForm.reset({
      sucursalId: "",
      puestoId: "",
      nombre: "",
      apellidos: "",
      cedula: "",
      email: "",
      telefono: undefined,
      fechaNacimiento: undefined,
      direccion: undefined,
      fechaIngreso: "",
      salarioBase: "" as unknown as undefined,
      tipoJornada: "completa",
      horasJornada: undefined,
      horaEntrada: undefined,
      horaSalida: undefined,
    });
    setIsCreateOpen(true);
  }

  function openEdit(row: EmpleadoRow) {
    setEditingEmpleado(row);
    editForm.reset({
      id: row.empleado.id,
      sucursalId: row.empleado.sucursalId,
      puestoId: row.empleado.puestoId,
      nombre: row.empleado.nombre,
      apellidos: row.empleado.apellidos,
      telefono: row.empleado.telefono ?? undefined,
      fechaNacimiento: row.empleado.fechaNacimiento ?? undefined,
      direccion: row.empleado.direccion ?? undefined,
      fechaIngreso: row.empleado.fechaIngreso,
      salarioBase: row.empleado.salarioBase as unknown as undefined,
      tipoJornada: row.empleado.tipoJornada,
      horasJornada: row.empleado.horasJornada ?? undefined,
      horaEntrada: row.empleado.horaEntrada ?? undefined,
      horaSalida: row.empleado.horaSalida ?? undefined,
    });
    setIsEditOpen(true);
  }

  async function handleCreate(formData: CreateEmpleadoData) {
    setIsSubmitting(true);
    const res = await createEmpleado(formData);
    if (res.success) {
      const resData = res.data as { pin?: string };
      if (resData?.pin) {
        toast("Empleado creado", {
          description: `PIN generado: ${resData.pin}. ${res.message}`,
          position: "top-right",
          duration: 8000,
        });
      } else {
        toast("Empleado creado", {
          description: res.message,
          position: "top-right",
        });
      }
      setIsCreateOpen(false);
      router.refresh();
    } else {
      const errorData = res.data as { errors?: Array<{ path?: Array<{ key: string }>; message: string }> };
      const errorMessages = errorData?.errors?.map(
        (e) => `${e.path?.map((p) => p.key).join(".")}: ${e.message}`,
      );
      toast("Error al crear empleado", {
        description: errorMessages?.length ? errorMessages.join("\n") : res.message,
        position: "top-right",
        duration: 8000,
      });
    }
    setIsSubmitting(false);
  }

  async function handleEdit(formData: Record<string, unknown>) {
    const payload = formData as UpdateEmpleadoData;
    setIsSubmitting(true);
    const res = await updateEmpleado(payload);
    if (res.success) {
      toast("Empleado actualizado", {
        description: res.message,
        position: "top-right",
      });
      setIsEditOpen(false);
      setEditingEmpleado(null);
      router.refresh();
    } else {
      toast("Error al actualizar empleado", {
        description: res.message,
        position: "top-right",
      });
    }
    setIsSubmitting(false);
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    setIsToggling(true);
    const res = await toggleEmpleadoEstado(toggleTarget.empleado.id);
    if (res.success) {
      toast("Estado actualizado", {
        description: res.message,
        position: "top-right",
      });
      setToggleTarget(null);
      router.refresh();
    } else {
      toast("Error al cambiar estado", {
        description: res.message,
        position: "top-right",
      });
    }
    setIsToggling(false);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl pb-1">Gestión de Empleados</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, apellidos o cédula..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 placeholder:text-xs"
                />
              </div>
              <Select value={filterSucursal} onValueChange={setFilterSucursal}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="size-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sucursal" />
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
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="licencia">Licencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate}>
              <UserPlus />
              Nuevo Empleado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre completo</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Salario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No se encontraron empleados.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.empleado.id}>
                    <TableCell className="font-medium">
                      {row.empleado.nombre} {row.empleado.apellidos}
                    </TableCell>
                    <TableCell>{row.empleado.cedula}</TableCell>
                    <TableCell>{row.sucursalNombre}</TableCell>
                    <TableCell>{row.puestoNombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatCRC(row.empleado.salarioBase)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.empleado.estado === "activo"
                            ? "default"
                            : "secondary"
                        }
                        className={estadoBadge[row.empleado.estado]}
                      >
                        {row.empleado.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setToggleTarget(row)}
                        >
                          <Power
                            className={`size-4 ${
                              row.empleado.estado === "activo"
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link
                            href={`/dashboard/empleados/${row.empleado.id}`}
                          >
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Empleado</DialogTitle>
            <DialogDescription>
              Completá los datos para registrar un nuevo empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            <FieldGroup>
              <Controller
                name="sucursalId"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="create-sucursal">Sucursal</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="create-sucursal">
                        <SelectValue placeholder="Seleccionar sucursal" />
                      </SelectTrigger>
                      <SelectContent>
                        {sucursales.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nombre}
                          </SelectItem>
                        ))}
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
              <Controller
                name="puestoId"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="create-puesto">Puesto</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="create-puesto">
                        <SelectValue placeholder="Seleccionar puesto" />
                      </SelectTrigger>
                      <SelectContent>
                        {puestos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                          </SelectItem>
                        ))}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="nombre"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-nombre">Nombre</FieldLabel>
                      <Input
                        id="create-nombre"
                        type="text"
                        placeholder="Nombre"
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
                  name="apellidos"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-apellidos">
                        Apellidos
                      </FieldLabel>
                      <Input
                        id="create-apellidos"
                        type="text"
                        placeholder="Apellidos"
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
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="cedula"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-cedula">Cédula</FieldLabel>
                      <Input
                        id="create-cedula"
                        type="text"
                        placeholder="123456789"
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
                  name="email"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-email">
                        Correo electrónico
                      </FieldLabel>
                      <Input
                        id="create-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
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
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="telefono"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-telefono">Teléfono</FieldLabel>
                      <Input
                        id="create-telefono"
                        type="text"
                        placeholder="8888-8888"
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
                <Controller
                  name="fechaNacimiento"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-fechaNacimiento">
                        Fecha de nacimiento
                      </FieldLabel>
                      <Input
                        id="create-fechaNacimiento"
                        type="date"
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
              </div>
              <Controller
                name="direccion"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="create-direccion">Dirección</FieldLabel>
                    <Textarea
                      id="create-direccion"
                      placeholder="Dirección de residencia"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="fechaIngreso"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-fechaIngreso">
                        Fecha de ingreso
                      </FieldLabel>
                      <Input
                        id="create-fechaIngreso"
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
                  name="salarioBase"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-salarioBase">
                        Salario base
                      </FieldLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₡
                        </span>
                        <Input
                          id="create-salarioBase"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          required
                          className="pl-7"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          aria-invalid={fieldState.invalid}
                        />
                      </div>
                      {fieldState.error && (
                        <p className="text-destructive text-sm">
                          {fieldState.error.message}
                        </p>
                      )}
                    </Field>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Controller
                  name="tipoJornada"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-tipoJornada">
                        Tipo de jornada
                      </FieldLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="create-tipoJornada">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completa">Completa</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
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
                <Controller
                  name="horasJornada"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-horasJornada">
                        Horas de jornada
                      </FieldLabel>
                      <Input
                        id="create-horasJornada"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="8"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          )
                        }
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
                  name="horaEntrada"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-horaEntrada">
                        Hora de entrada
                      </FieldLabel>
                      <Input
                        id="create-horaEntrada"
                        type="time"
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
              </div>
              <Controller
                name="horaSalida"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="create-horaSalida">
                      Hora de salida
                    </FieldLabel>
                    <Input
                      id="create-horaSalida"
                      type="time"
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
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creando..." : "Crear Empleado"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>
              Modificá los datos del empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            <FieldGroup>
              <Controller
                name="id"
                control={editForm.control}
                render={({ field }) => (
                  <Input type="hidden" {...field} />
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="sucursalId"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-sucursal">Sucursal</FieldLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="edit-sucursal">
                          <SelectValue placeholder="Seleccionar sucursal" />
                        </SelectTrigger>
                        <SelectContent>
                          {sucursales.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nombre}
                            </SelectItem>
                          ))}
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
                <Controller
                  name="puestoId"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-puesto">Puesto</FieldLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="edit-puesto">
                          <SelectValue placeholder="Seleccionar puesto" />
                        </SelectTrigger>
                        <SelectContent>
                          {puestos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
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
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="nombre"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-nombre">Nombre</FieldLabel>
                      <Input
                        id="edit-nombre"
                        type="text"
                        placeholder="Nombre"
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
                <Controller
                  name="apellidos"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-apellidos">Apellidos</FieldLabel>
                      <Input
                        id="edit-apellidos"
                        type="text"
                        placeholder="Apellidos"
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
              </div>
              <Controller
                name="telefono"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-telefono">Teléfono</FieldLabel>
                    <Input
                      id="edit-telefono"
                      type="text"
                      placeholder="8888-8888"
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
              <Controller
                name="fechaNacimiento"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-fechaNacimiento">
                      Fecha de nacimiento
                    </FieldLabel>
                    <Input
                      id="edit-fechaNacimiento"
                      type="date"
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
              <Controller
                name="direccion"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-direccion">Dirección</FieldLabel>
                    <Textarea
                      id="edit-direccion"
                      placeholder="Dirección de residencia"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="fechaIngreso"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-fechaIngreso">
                        Fecha de ingreso
                      </FieldLabel>
                      <Input
                        id="edit-fechaIngreso"
                        type="date"
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
                <Controller
                  name="salarioBase"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-salarioBase">
                        Salario base
                      </FieldLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₡
                        </span>
                        <Input
                          id="edit-salarioBase"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          aria-invalid={fieldState.invalid}
                        />
                      </div>
                      {fieldState.error && (
                        <p className="text-destructive text-sm">
                          {fieldState.error.message}
                        </p>
                      )}
                    </Field>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Controller
                  name="tipoJornada"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-tipoJornada">
                        Tipo de jornada
                      </FieldLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="edit-tipoJornada">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completa">Completa</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
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
                <Controller
                  name="horasJornada"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-horasJornada">
                        Horas de jornada
                      </FieldLabel>
                      <Input
                        id="edit-horasJornada"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="8"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          )
                        }
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
                  name="horaEntrada"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-horaEntrada">
                        Hora de entrada
                      </FieldLabel>
                      <Input
                        id="edit-horaEntrada"
                        type="time"
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
              </div>
              <Controller
                name="horaSalida"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-horaSalida">
                      Hora de salida
                    </FieldLabel>
                    <Input
                      id="edit-horaSalida"
                      type="time"
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
              {editingEmpleado?.empleado?.pin && (
                <Field>
                  <FieldLabel>PIN (solo lectura)</FieldLabel>
                  <Input
                    value={editingEmpleado.empleado.pin}
                    readOnly
                    className="bg-muted font-mono text-lg tracking-widest"
                  />
                </Field>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.empleado.estado === "activo"
                ? "Desactivar Empleado"
                : "Activar Empleado"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.empleado.estado === "activo"
                ? `¿Estás seguro de desactivar a "${toggleTarget?.empleado.nombre} ${toggleTarget?.empleado.apellidos}"?`
                : `¿Estás seguro de activar a "${toggleTarget?.empleado.nombre} ${toggleTarget?.empleado.apellidos}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={isToggling}
              variant={
                toggleTarget?.empleado.estado === "activo"
                  ? "destructive"
                  : "default"
              }
            >
              {isToggling ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
