"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFeriado,
  updateFeriado,
  toggleFeriado,
  eliminarFeriado,
} from "@/actions/feriados.actions";

interface Feriado {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
  activo: boolean | null;
}

export function FeriadosTable({ feriados: initial }: { feriados: Feriado[] }) {
  const [feriados, setFeriados] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fecha: "", nombre: "", tipo: "nacional" });

  function resetForm() {
    setForm({ fecha: "", nombre: "", tipo: "nacional" });
    setShowForm(false);
    setEditingId(null);
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await createFeriado(form);
      if (result.success) {
        toast.success(result.message);
        const data = result.data as { feriado: Feriado };
        setFeriados((prev) => [data.feriado, ...prev]);
        resetForm();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al crear feriado");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(id: string) {
    setLoading(true);
    try {
      const result = await updateFeriado({ id, ...form });
      if (result.success) {
        toast.success(result.message);
        setFeriados((prev) => prev.map((f) => (f.id === id ? { ...f, ...form } : f)));
        resetForm();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string) {
    setLoading(true);
    try {
      const result = await toggleFeriado(id);
      if (result.success) {
        toast.success(result.message);
        setFeriados((prev) =>
          prev.map((f) => (f.id === id ? { ...f, activo: !f.activo } : f)),
        );
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al cambiar estado");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(f: Feriado) {
    setEditingId(f.id);
    setForm({ fecha: f.fecha, nombre: f.nombre, tipo: f.tipo });
    setShowForm(true);
  }

  async function handleDelete(f: Feriado) {
    const msg = `¿Eliminar el feriado "${f.nombre}" del ${formatDate(f.fecha)}? Si ya hay solicitudes de vacaciones que cruzan esta fecha, el cálculo de días hábiles se recalculará automáticamente.`;
    if (!window.confirm(msg)) return;
    setLoading(true);
    try {
      const result = await eliminarFeriado(f.id);
      if (result.success) {
        toast.success(result.message);
        setFeriados((prev) => prev.filter((x) => x.id !== f.id));
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al eliminar feriado");
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Feriados</span>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} aria-label="Agregar feriado">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {showForm && (
          <div className="border-b p-4">
            <div className="flex flex-wrap items-end gap-2">
              <Field>
                <FieldLabel>Fecha</FieldLabel>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                  aria-label="Fecha del feriado"
                />
              </Field>
              <Field>
                <FieldLabel>Nombre</FieldLabel>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre del feriado"
                  aria-label="Nombre del feriado"
                />
              </Field>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
                >
                  <SelectTrigger className="w-32" aria-label="Tipo de feriado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="religioso">Religioso</SelectItem>
                    <SelectItem value="opcional">Opcional</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button
                size="sm"
                onClick={editingId ? () => handleEdit(editingId) : handleCreate}
                disabled={loading || !form.fecha || !form.nombre}
                aria-label={editingId ? "Guardar cambios" : "Crear feriado"}
              >
                {editingId ? (
                  <><Check className="h-4 w-4 mr-1" /> Guardar</>
                ) : (
                  <><Plus className="h-4 w-4 mr-1" /> Crear</>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={resetForm} aria-label="Cancelar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {feriados.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hay feriados registrados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feriados.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{formatDate(f.fecha)}</TableCell>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{f.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.activo ? "default" : "secondary"}>
                      {f.activo ? "Sí" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(f)}
                        aria-label={`Editar ${f.nombre}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(f.id)}
                        disabled={loading}
                        aria-label={f.activo ? `Desactivar ${f.nombre}` : `Activar ${f.nombre}`}
                      >
                        {f.activo ? (
                          <ToggleRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(f)}
                        disabled={loading}
                        aria-label={`Eliminar ${f.nombre}`}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
  );
}
