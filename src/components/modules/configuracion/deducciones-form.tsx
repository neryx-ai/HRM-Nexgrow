"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getDeduccionesConfig, updateDeduccion, createDeduccion } from "@/actions/configuracion.actions";

interface Deduccion {
  id: string;
  clave: string;
  valor: string;
  descripcion: string | null;
  activo: boolean | null;
}

const DEDUCCION_LABELS: Record<string, string> = {
  ccssEmpleado: "CCSS Empleado (%)",
  insEmpleado: "INS Empleado (%)",
  bancoPopular: "Banco Popular (%)",
  factorHorasExtra: "Factor Horas Extra",
};

export function DeduccionesForm({ deducciones: initial }: { deducciones: Deduccion[] }) {
  const [deducciones, setDeducciones] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ clave: "", valor: "", descripcion: "" });

  const handleSave = useCallback(async (d: Deduccion) => {
    setLoading(true);
    try {
      const result = await updateDeduccion({ id: d.id, valor: d.valor });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleCreate() {
    setLoading(true);
    try {
      const result = await createDeduccion({
        clave: newForm.clave,
        valor: newForm.valor,
        descripcion: newForm.descripcion || undefined,
      });
      if (result.success) {
        toast.success(result.message);
        const data = result.data as { deduccion: Deduccion };
        setDeducciones((prev) => [...prev, data.deduccion]);
        setShowCreate(false);
        setNewForm({ clave: "", valor: "", descripcion: "" });
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al crear deducción");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const result = await getDeduccionesConfig();
    if (result.success) {
      const data = result.data as { deducciones: Deduccion[] };
      setDeducciones(data.deducciones);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Deducciones legales</span>
          <div className="flex gap-1">
            {!showCreate && (
              <Button size="sm" onClick={() => setShowCreate(true)} aria-label="Agregar deducción">
                <Plus className="h-4 w-4 mr-1" /> Nueva
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={refresh} aria-label="Recargar">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
            <div className="flex flex-wrap items-end gap-2">
              <Field>
                <FieldLabel>Clave</FieldLabel>
                <Input
                  value={newForm.clave}
                  onChange={(e) => setNewForm((f) => ({ ...f, clave: e.target.value }))}
                  placeholder="ej: ccssPatronal"
                  aria-label="Clave de la deducción"
                />
              </Field>
              <Field>
                <FieldLabel>Valor</FieldLabel>
                <Input
                  value={newForm.valor}
                  onChange={(e) => setNewForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0.0917"
                  aria-label="Valor de la deducción"
                />
              </Field>
              <Field>
                <FieldLabel>Descripción</FieldLabel>
                <Input
                  value={newForm.descripcion}
                  onChange={(e) => setNewForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción opcional"
                  aria-label="Descripción"
                />
              </Field>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={loading || !newForm.clave || !newForm.valor}
                aria-label="Crear deducción"
              >
                <Plus className="h-4 w-4 mr-1" /> Crear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewForm({ clave: "", valor: "", descripcion: "" }); }} aria-label="Cancelar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {deducciones.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay deducciones configuradas.</p>
          )}
          {deducciones.map((d) => (
            <FieldGroup key={d.id} className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel>{DEDUCCION_LABELS[d.clave] || d.clave}</FieldLabel>
                <Input
                  type="text"
                  value={d.valor}
                  onChange={(e) => {
                    setDeducciones((prev) =>
                      prev.map((p) => (p.id === d.id ? { ...p, valor: e.target.value } : p)),
                    );
                  }}
                  aria-label={`Valor de ${DEDUCCION_LABELS[d.clave] || d.clave}`}
                />
              </Field>
              {d.descripcion && (
                <p className="text-xs text-muted-foreground pb-2 flex-1 hidden md:block">
                  {d.descripcion}
                </p>
              )}
              <Button
                size="sm"
                onClick={() => handleSave(d)}
                disabled={loading}
                aria-label={`Guardar ${DEDUCCION_LABELS[d.clave] || d.clave}`}
              >
                <Save className="h-4 w-4" />
              </Button>
            </FieldGroup>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
