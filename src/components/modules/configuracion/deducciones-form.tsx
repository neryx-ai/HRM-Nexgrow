"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  RefreshCw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDeduccionesConfig,
  crearDeduccion,
  actualizarDeduccion,
  eliminarDeduccion,
  toggleDeduccion,
} from "@/actions/configuracion.actions";

export interface Deduccion {
  id: string;
  nombre: string;
  clave: string;
  tipo: "porcentaje" | "monto_fijo" | "factor";
  base: "total_ingresos" | "gravable_renta" | null;
  valor: string;
  descripcion: string | null;
  categoria: string;
  orden: number;
  activo: boolean | null;
}

type TipoFormValue = Deduccion["tipo"];
type BaseFormValue = "total_ingresos" | "gravable_renta";

interface FormState {
  nombre: string;
  clave: string;
  tipo: TipoFormValue;
  base: BaseFormValue;
  valor: string;
  descripcion: string;
}

const EMPTY_FORM: FormState = {
  nombre: "",
  clave: "",
  tipo: "porcentaje",
  base: "total_ingresos",
  valor: "",
  descripcion: "",
};

function formatValor(tipo: TipoFormValue, valor: string): string {
  const v = parseFloat(valor);
  if (Number.isNaN(v)) return valor;
  if (tipo === "porcentaje") {
    return `${(v * 100).toFixed(4).replace(/\.?0+$/, "")}%`;
  }
  if (tipo === "factor") {
    return `${v.toFixed(4).replace(/\.?0+$/, "")}× (${(v * 100).toFixed(2)}%)`;
  }
  return `¢${v.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
}

function tipoBadge(tipo: TipoFormValue): { label: string; variant: "default" | "secondary" | "outline" } {
  if (tipo === "porcentaje") return { label: "%", variant: "default" };
  if (tipo === "factor") return { label: "×", variant: "outline" };
  return { label: "¢", variant: "secondary" };
}

function baseLabel(base: Deduccion["base"]): string {
  if (base === "gravable_renta") return "gravable";
  if (base === "total_ingresos") return "ingresos";
  return "—";
}

export function DeduccionesForm({
  deducciones: initial,
}: {
  deducciones: Deduccion[];
}) {
  const [deducciones, setDeducciones] = useState<Deduccion[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setCreating(false);
  }

  function startEdit(d: Deduccion) {
    setEditingId(d.id);
    setCreating(false);
    setForm({
      nombre: d.nombre,
      clave: d.clave,
      tipo: d.tipo,
      base: (d.base ?? "total_ingresos") as BaseFormValue,
      valor: d.valor,
      descripcion: d.descripcion ?? "",
    });
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  async function refresh() {
    const result = await getDeduccionesConfig();
    if (result.success) {
      const data = result.data as { deducciones: Deduccion[] };
      setDeducciones(data.deducciones);
    }
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {
      nombre: form.nombre,
      tipo: form.tipo,
      valor: form.valor,
      descripcion: form.descripcion || undefined,
    };
    if (form.tipo !== "factor") {
      payload.base = form.tipo === "monto_fijo" ? "total_ingresos" : form.base;
    }
    return payload;
  }

  function handleSubmit() {
    if (!form.nombre || !form.valor) return;
    if (creating) {
      const payload = {
        ...buildPayload(),
        clave: form.clave || undefined,
      };
      startTransition(async () => {
        const result = await crearDeduccion(payload);
        if (result.success) {
          toast.success(result.message);
          resetForm();
          await refresh();
        } else {
          toast.error(result.message);
        }
      });
    } else if (editingId) {
      const payload = { id: editingId, ...buildPayload() };
      startTransition(async () => {
        const result = await actualizarDeduccion(payload);
        if (result.success) {
          toast.success(result.message);
          resetForm();
          await refresh();
        } else {
          toast.error(result.message);
        }
      });
    }
  }

  function handleDelete(d: Deduccion) {
    const msg = `¿Eliminar "${d.nombre}"? Si ya existen planillas generadas, conservarán el cálculo histórico (guardado en el desglose).`;
    if (!window.confirm(msg)) return;

    startTransition(async () => {
      const result = await eliminarDeduccion({ id: d.id });
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) await refresh();
    });
  }

  function handleToggle(d: Deduccion) {
    startTransition(async () => {
      const result = await toggleDeduccion({ id: d.id });
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) await refresh();
    });
  }

  function valorPlaceholder(): string {
    if (form.tipo === "porcentaje") return "0.0917";
    if (form.tipo === "factor") return "1.5 (150%)";
    return "1500.00";
  }

  function valorLabel(): string {
    if (form.tipo === "porcentaje") return "Valor (0.0917 = 9.17%)";
    if (form.tipo === "factor") return "Valor (1 = 100%, 1.5 = 150%, 2 = 200%)";
    return "Valor (¢)";
  }

  function renderForm() {
    return (
      <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field>
            <FieldLabel>Nombre</FieldLabel>
            <Input
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
              placeholder="Ej: CCSS Empleado"
              aria-label="Nombre"
            />
          </Field>
          {creating && (
            <Field>
              <FieldLabel>
                Clave{" "}
                <span className="text-muted-foreground text-xs">
                  (opcional)
                </span>
              </FieldLabel>
              <Input
                value={form.clave}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clave: e.target.value }))
                }
                placeholder="Generada automáticamente"
                aria-label="Clave"
              />
            </Field>
          )}
          <Field>
            <FieldLabel>Tipo</FieldLabel>
            <Select
              value={form.tipo}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  tipo: v as TipoFormValue,
                  base:
                    v === "monto_fijo"
                      ? "total_ingresos"
                      : v === "factor"
                        ? "total_ingresos"
                        : f.base,
                }))
              }
            >
              <SelectTrigger aria-label="Tipo de deducción">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="porcentaje">Porcentaje</SelectItem>
                <SelectItem value="monto_fijo">Monto fijo (¢)</SelectItem>
                <SelectItem value="factor">Factor multiplicador</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {form.tipo !== "factor" && (
            <Field>
              <FieldLabel>Base</FieldLabel>
              <Select
                value={form.base}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, base: v as BaseFormValue }))
                }
                disabled={form.tipo === "monto_fijo"}
              >
                <SelectTrigger aria-label="Base de cálculo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_ingresos">
                    Total ingresos
                  </SelectItem>
                  <SelectItem value="gravable_renta">
                    Gravable de renta
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field>
            <FieldLabel>{valorLabel()}</FieldLabel>
            <Input
              value={form.valor}
              onChange={(e) =>
                setForm((f) => ({ ...f, valor: e.target.value }))
              }
              placeholder={valorPlaceholder()}
              aria-label="Valor"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>Descripción</FieldLabel>
          <Input
            value={form.descripcion}
            onChange={(e) =>
              setForm((f) => ({ ...f, descripcion: e.target.value }))
            }
            placeholder="Descripción breve (opcional)"
            aria-label="Descripción"
          />
        </Field>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={pending || !form.nombre || !form.valor}
          >
            {creating ? (
              <>
                <Plus className="h-4 w-4 mr-1" /> Crear
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={resetForm}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  function renderRow(d: Deduccion) {
    const badge = tipoBadge(d.tipo);
    return (
      <TableRow key={d.id} className={!d.activo ? "opacity-50" : ""}>
        <TableCell>
          <div className="font-medium">{d.nombre}</div>
          {d.descripcion && (
            <div className="text-xs text-muted-foreground">
              {d.descripcion}
            </div>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground font-mono">
          {d.clave}
        </TableCell>
        <TableCell>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="ml-2 text-xs text-muted-foreground">
            {baseLabel(d.base)}
          </span>
        </TableCell>
        <TableCell className="font-mono">{formatValor(d.tipo, d.valor)}</TableCell>
        <TableCell>
          <Badge variant={d.activo ? "default" : "outline"}>
            {d.activo ? "Activo" : "Inactivo"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEdit(d)}
              disabled={pending}
              aria-label={`Editar ${d.nombre}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(d)}
              disabled={pending}
              aria-label={
                d.activo ? `Desactivar ${d.nombre}` : `Activar ${d.nombre}`
              }
              title={d.activo ? "Desactivar" : "Activar"}
            >
              {d.activo ? (
                <ToggleRight className="h-4 w-4 text-emerald-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(d)}
              disabled={pending}
              aria-label={`Eliminar ${d.nombre}`}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  const editing = editingId
    ? deducciones.find((d) => d.id === editingId)
    : undefined;
  const showFormRow = creating || Boolean(editing);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span>Deducciones y parámetros configurables</span>
          <div className="flex gap-1">
            {!creating && !editingId && (
              <Button
                size="sm"
                onClick={startCreate}
                aria-label="Agregar deducción"
              >
                <Plus className="h-4 w-4 mr-1" /> Nuevo
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={pending}
              aria-label="Recargar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showFormRow && <div className="space-y-3">{renderForm()}</div>}

        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Configuración activa ({deducciones.length})
          </h4>
          {deducciones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
              No hay deducciones configuradas. Agregá una para empezar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Tipo / Base</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{deducciones.map(renderRow)}</TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
