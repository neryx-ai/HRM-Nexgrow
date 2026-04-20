"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Search, Power, MapPin, Phone } from "lucide-react";
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
  createSucursal,
  updateSucursal,
  toggleSucursalEstado,
} from "@/actions/sucursal.actions";
import {
  CreateSucursalSchema,
  UpdateSucursalSchema,
} from "@/lib/validations/sucursal";
import type { CreateSucursalData, UpdateSucursalData } from "@/lib/validations/sucursal";

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  estado: "activa" | "inactiva";
  createdAt: Date;
  updatedAt: Date;
}

interface SucursalesManagerProps {
  sucursales: Sucursal[];
}

export function SucursalesManager({ sucursales }: SucursalesManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Sucursal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const filtered = sucursales.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.nombre.toLowerCase().includes(term) ||
      (s.direccion && s.direccion.toLowerCase().includes(term)) ||
      (s.telefono && s.telefono.toLowerCase().includes(term))
    );
  });

  const createForm = useForm<CreateSucursalData>({
    resolver: valibotResolver(CreateSucursalSchema),
    defaultValues: {
      nombre: "",
      direccion: undefined,
      telefono: undefined,
    },
  });

  const editForm = useForm({
    resolver: valibotResolver(UpdateSucursalSchema),
    defaultValues: {
      id: "",
      nombre: undefined,
      direccion: undefined,
      telefono: undefined,
    } as UpdateSucursalData,
  });

  function openCreate() {
    createForm.reset({ nombre: "", direccion: undefined, telefono: undefined });
    setIsCreateOpen(true);
  }

  function openEdit(sucursal: Sucursal) {
    setEditingSucursal(sucursal);
    editForm.reset({
      id: sucursal.id,
      nombre: sucursal.nombre,
      direccion: sucursal.direccion || undefined,
      telefono: sucursal.telefono || undefined,
    });
    setIsEditOpen(true);
  }

  async function handleCreate(data: CreateSucursalData) {
    setIsSubmitting(true);
    const res = await createSucursal(data);
    if (res.success) {
      toast("Sucursal creada", {
        description: res.message,
        position: "top-right",
      });
      setIsCreateOpen(false);
      router.refresh();
    } else {
      toast("Error al crear sucursal", {
        description: res.message,
        position: "top-right",
      });
    }
    setIsSubmitting(false);
  }

  async function handleEdit(formData: Record<string, unknown>) {
    const payload = formData as UpdateSucursalData;
    setIsSubmitting(true);
    const res = await updateSucursal(payload);
    if (res.success) {
      toast("Sucursal actualizada", {
        description: res.message,
        position: "top-right",
      });
      setIsEditOpen(false);
      setEditingSucursal(null);
      router.refresh();
    } else {
      toast("Error al actualizar sucursal", {
        description: res.message,
        position: "top-right",
      });
    }
    setIsSubmitting(false);
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    setIsToggling(true);
    const res = await toggleSucursalEstado(toggleTarget.id);
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
          <CardTitle>Gestión de Sucursales</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar sucursales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus />
              Nueva Sucursal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No se encontraron sucursales.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sucursal) => (
                  <TableRow key={sucursal.id}>
                    <TableCell className="font-medium">
                      {sucursal.nombre}
                    </TableCell>
                    <TableCell>
                      {sucursal.direccion ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          {sucursal.direccion}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sucursal.telefono ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3.5 text-muted-foreground" />
                          {sucursal.telefono}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sucursal.estado === "activa" ? "default" : "secondary"
                        }
                        className={
                          sucursal.estado === "activa"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }
                      >
                        {sucursal.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(sucursal)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setToggleTarget(sucursal)}
                        >
                          <Power
                            className={`size-4 ${
                              sucursal.estado === "activa"
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            }`}
                          />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Sucursal</DialogTitle>
            <DialogDescription>
              Completá los datos para crear una nueva sucursal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
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
                      placeholder="Nombre de la sucursal"
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
                name="direccion"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="create-direccion">Dirección</FieldLabel>
                    <Textarea
                      id="create-direccion"
                      placeholder="Dirección de la sucursal"
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
                name="telefono"
                control={createForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="create-telefono">Teléfono</FieldLabel>
                    <Input
                      id="create-telefono"
                      type="text"
                      placeholder="Teléfono de contacto"
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
                  {isSubmitting ? "Creando..." : "Crear Sucursal"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sucursal</DialogTitle>
            <DialogDescription>
              Modificá los datos de la sucursal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            <FieldGroup>
              <Controller
                name="nombre"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-nombre">Nombre</FieldLabel>
                    <Input
                      id="edit-nombre"
                      type="text"
                      placeholder="Nombre de la sucursal"
                      required
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
                      placeholder="Dirección de la sucursal"
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
                name="telefono"
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="edit-telefono">Teléfono</FieldLabel>
                    <Input
                      id="edit-telefono"
                      type="text"
                      placeholder="Teléfono de contacto"
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
              {toggleTarget?.estado === "activa"
                ? "Desactivar Sucursal"
                : "Activar Sucursal"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.estado === "activa"
                ? `¿Estás seguro de desactivar la sucursal "${toggleTarget?.nombre}"?`
                : `¿Estás seguro de activar la sucursal "${toggleTarget?.nombre}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={isToggling}
              variant={
                toggleTarget?.estado === "activa" ? "destructive" : "default"
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
