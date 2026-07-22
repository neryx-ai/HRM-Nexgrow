"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Search, Trash2, DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  createPuesto,
  updatePuesto,
  deletePuesto,
} from "@/actions/puesto.actions";
import * as v from "valibot";
import {
  CreatePuestoSchema,
  UpdatePuestoSchema,
} from "@/lib/validations/puesto";

type CreatePuestoInput = v.InferInput<typeof CreatePuestoSchema>;
type UpdatePuestoInput = v.InferInput<typeof UpdatePuestoSchema>;

interface Puesto {
  id: string;
  nombre: string;
  descripcion: string | null;
  salarioBase: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PuestosManagerProps {
  puestos: Puesto[];
}

const toastStyle = {
  "--border-radius": "calc(var(--radius) + 4px)",
} as React.CSSProperties;

function formatCRC(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 2,
  }).format(num);
}

export function PuestosManager({ puestos }: PuestosManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editPuesto, setEditPuesto] = useState<Puesto | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const filtered = puestos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const createForm = useForm<CreatePuestoInput>({
    resolver: valibotResolver(CreatePuestoSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      nombre: "",
      descripcion: "",
      salarioBase: "",
    },
  });

  const editForm = useForm<UpdatePuestoInput>({
    resolver: valibotResolver(UpdatePuestoSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      id: "",
      nombre: "",
      descripcion: "",
      salarioBase: "",
    },
  });

  function openCreate() {
    createForm.reset({ nombre: "", descripcion: "", salarioBase: "" });
    setCreateOpen(true);
  }

  function openEdit(puesto: Puesto) {
    editForm.reset({
      id: puesto.id,
      nombre: puesto.nombre,
      descripcion: puesto.descripcion ?? "",
      salarioBase: puesto.salarioBase,
    });
    setEditPuesto(puesto);
    setEditOpen(true);
  }

  async function onCreateSubmit(data: CreatePuestoInput) {
    startTransition(async () => {
      const res = await createPuesto(data);
      if (res.success) {
        toast("Puesto creado", {
          description: res.message,
          position: "top-right",
          style: toastStyle,
        });
        setCreateOpen(false);
        createForm.reset();
        router.refresh();
      } else {
        toast("Error al crear puesto", {
          description: res.message,
          position: "top-right",
          style: toastStyle,
        });
      }
    });
  }

  async function onEditSubmit(data: UpdatePuestoInput) {
    startTransition(async () => {
      const res = await updatePuesto(data);
      if (res.success) {
        toast("Puesto actualizado", {
          description: res.message,
          position: "top-right",
          style: toastStyle,
        });
        setEditOpen(false);
        setEditPuesto(null);
        editForm.reset();
        router.refresh();
      } else {
        toast("Error al actualizar puesto", {
          description: res.message,
          position: "top-right",
          style: toastStyle,
        });
      }
    });
  }

  async function onDelete(id: string) {
    startTransition(async () => {
      const res = await deletePuesto(id);
      if (res.success) {
        toast("Puesto eliminado", {
          description: res.message,
          position: "top-right",
          style: toastStyle,
        });
        router.refresh();
      } else {
        toast("Error al eliminar puesto", {
          description: res.message,
          position: "top-right",
          style: toastStyle,
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl pb-1">Listado de Puestos</CardTitle>
        <CardDescription>
          Administra los puestos de trabajo de la organización
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar puesto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus />
            Nuevo Puesto
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              {search
                ? "No se encontraron puestos con esa búsqueda"
                : "No hay puestos registrados"}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Descripción
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="size-3.5" />
                      Salario Base
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((puesto) => (
                  <TableRow key={puesto.id}>
                    <TableCell className="font-medium">
                      {puesto.nombre}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                      {puesto.descripcion ?? (
                        <span className="text-muted-foreground italic">
                          Sin descripción
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatCRC(puesto.salarioBase)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(puesto)}
                          disabled={isPending}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={isPending}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Eliminar puesto
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar el puesto{" "}
                                <strong>{puesto.nombre}</strong>? Esta acción no
                                se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => onDelete(puesto.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Puesto</DialogTitle>
              <DialogDescription>
                Completa los datos para registrar un nuevo puesto de trabajo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
              <FieldGroup>
                <Controller
                  name="nombre"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-nombre">Nombre</FieldLabel>
                      <Input
                        id="create-nombre"
                        type="text"
                        placeholder="Ej: Desarrollador Frontend"
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
                  name="descripcion"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-descripcion">
                        Descripción
                      </FieldLabel>
                      <Textarea
                        id="create-descripcion"
                        placeholder="Descripción del puesto..."
                        rows={3}
                        {...field}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && (
                        <p className="text-destructive text-sm">
                          {fieldState.error.message}
                        </p>
                      )}
                      <FieldDescription>Opcional</FieldDescription>
                    </Field>
                  )}
                />
                <Controller
                  name="salarioBase"
                  control={createForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="create-salario">
                        Salario Base
                      </FieldLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₡
                        </span>
                        <Input
                          id="create-salario"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          required
                          className="pl-7"
                          {...field}
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Creando..." : "Crear Puesto"}
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Puesto</DialogTitle>
              <DialogDescription>
                Modifica los datos del puesto de trabajo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
              <FieldGroup>
                <Controller
                  name="id"
                  control={editForm.control}
                  render={({ field }) => <Input type="hidden" {...field} />}
                />
                <Controller
                  name="nombre"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-nombre">Nombre</FieldLabel>
                      <Input
                        id="edit-nombre"
                        type="text"
                        placeholder="Ej: Desarrollador Frontend"
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
                  name="descripcion"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-descripcion">
                        Descripción
                      </FieldLabel>
                      <Textarea
                        id="edit-descripcion"
                        placeholder="Descripción del puesto..."
                        rows={3}
                        {...field}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && (
                        <p className="text-destructive text-sm">
                          {fieldState.error.message}
                        </p>
                      )}
                      <FieldDescription>Opcional</FieldDescription>
                    </Field>
                  )}
                />
                <Controller
                  name="salarioBase"
                  control={editForm.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor="edit-salario">
                        Salario Base
                      </FieldLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₡
                        </span>
                        <Input
                          id="edit-salario"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          required
                          className="pl-7"
                          {...field}
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
