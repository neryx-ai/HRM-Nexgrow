"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, ToggleLeft, ToggleRight, Pencil, X, Check } from "lucide-react";
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
  createTramoRenta,
  updateTramoRenta,
  toggleTramoRenta,
} from "@/actions/tramo-renta.actions";

interface Tramo {
  id: string;
  limiteInferior: string;
  limiteSuperior: string | null;
  porcentaje: string;
  montoExcedente: string;
  descripcion: string | null;
  activo: boolean | null;
}

export function TramosTable({ tramos: initial }: { tramos: Tramo[] }) {
  const [tramos, setTramos] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    limiteInferior: "",
    limiteSuperior: "",
    porcentaje: "",
    montoExcedente: "",
    descripcion: "",
  });

  function resetForm() {
    setForm({ limiteInferior: "", limiteSuperior: "", porcentaje: "", montoExcedente: "", descripcion: "" });
    setShowForm(false);
    setEditingId(null);
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await createTramoRenta({
        ...form,
        limiteSuperior: form.limiteSuperior || undefined,
        descripcion: form.descripcion || undefined,
      });
      if (result.success) {
        toast.success(result.message);
        resetForm();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al crear tramo");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(id: string) {
    setLoading(true);
    try {
      const result = await updateTramoRenta({
        id,
        ...form,
        limiteSuperior: form.limiteSuperior || undefined,
        descripcion: form.descripcion || undefined,
      });
      if (result.success) {
        toast.success(result.message);
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
      const result = await toggleTramoRenta(id);
      if (result.success) {
        toast.success(result.message);
        setTramos((prev) => prev.map((t) => (t.id === id ? { ...t, activo: !t.activo } : t)));
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al cambiar estado");
    } finally {
      setLoading(false);
    }
  }

  
  function startEdit(t: Tramo) {
    setEditingId(t.id);
    setForm({
      limiteInferior: t.limiteInferior,
      limiteSuperior: t.limiteSuperior ?? "",
      porcentaje: t.porcentaje,
      montoExcedente: t.montoExcedente,
      descripcion: t.descripcion ?? "",
    });
    setShowForm(true);
  }

  const fmt = (n: string) => parseFloat(n).toLocaleString("es-CR", { minimumFractionDigits: 2 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Tramos de Renta</span>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} aria-label="Agregar tramo">
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
                <FieldLabel>Desde (¢)</FieldLabel>
                <Input
                  type="number"
                  value={form.limiteInferior}
                  onChange={(e) => setForm((f) => ({ ...f, limiteInferior: e.target.value }))}
                  aria-label="Límite inferior"
                />
              </Field>
              <Field>
                <FieldLabel>Hasta (¢)</FieldLabel>
                <Input
                  type="number"
                  value={form.limiteSuperior}
                  onChange={(e) => setForm((f) => ({ ...f, limiteSuperior: e.target.value }))}
                  placeholder="vacío = infinito"
                  aria-label="Límite superior"
                />
              </Field>
              <Field>
                <FieldLabel>%</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={form.porcentaje}
                  onChange={(e) => setForm((f) => ({ ...f, porcentaje: e.target.value }))}
                  aria-label="Porcentaje"
                />
              </Field>
              <Field>
                <FieldLabel>Excedente (¢)</FieldLabel>
                <Input
                  type="number"
                  value={form.montoExcedente}
                  onChange={(e) => setForm((f) => ({ ...f, montoExcedente: e.target.value }))}
                  aria-label="Monto excedente"
                />
              </Field>
              <Field>
                <FieldLabel>Descripción</FieldLabel>
                <Input
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción"
                  aria-label="Descripción"
                />
              </Field>
              <Button
                size="sm"
                onClick={editingId ? () => handleEdit(editingId) : handleCreate}
                disabled={loading || !form.limiteInferior || !form.porcentaje || !form.montoExcedente}
                aria-label={editingId ? "Guardar tramo" : "Crear tramo"}
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
        {tramos.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No hay tramos de renta configurados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Desde</TableHead>
                <TableHead className="text-right">Hasta</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Excedente</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tramos.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-right font-mono">¢{fmt(t.limiteInferior)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {t.limiteSuperior ? `¢${fmt(t.limiteSuperior)}` : "∞"}
                  </TableCell>
                  <TableCell className="text-right font-mono">{t.porcentaje}%</TableCell>
                  <TableCell className="text-right font-mono">¢{fmt(t.montoExcedente)}</TableCell>
                  <TableCell className="text-sm">{t.descripcion || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.activo ? "default" : "secondary"}>
                      {t.activo ? "Sí" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(t)}
                        aria-label="Editar tramo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(t.id)}
                        disabled={loading}
                        aria-label={t.activo ? "Desactivar tramo" : "Activar tramo"}
                      >
                        {t.activo ? (
                          <ToggleRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
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
