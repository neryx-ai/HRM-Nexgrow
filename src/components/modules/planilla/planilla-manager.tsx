"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, FileText, CalendarDays, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { crearPlanilla, anularPlanilla } from "@/actions/planilla.actions";
import { CrearPlanillaSchema } from "@/lib/validations/planilla";
import type { CrearPlanillaData } from "@/lib/validations/planilla";

interface PlanillaItem {
  planilla: {
    id: string;
    tipo: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    fechaPago: string | null;
    totalEmpleados: number;
    totalSalariosBrutos: string;
    totalDeduccionesLegales: string;
    totalDeduccionesAdicionales: string;
    totalSalariosNeto: string;
    creadoPor: string;
    confirmadoPor: string | null;
    confirmadoEn: Date | null;
    nota: string | null;
    createdAt: Date;
  };
  creadoPorNombre: string;
  confirmadoPorNombre: string | null;
}

const estadoVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  borrador: "outline",
  procesada: "default",
  anulada: "destructive",
};

const estadoLabel: Record<string, string> = {
  borrador: "Borrador",
  procesada: "Procesada",
  anulada: "Anulada",
};

function fmtCRC(n: string | number) {
  return parseFloat(String(n)).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PlanillaManager({ planillas }: { planillas: PlanillaItem[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anularId, setAnularId] = useState<string | null>(null);

  const { register, control, handleSubmit, reset } = useForm({
    resolver: valibotResolver(CrearPlanillaSchema),
    defaultValues: {
      tipo: "mensual" as const,
      fechaInicio: "",
      fechaFin: "",
      nota: undefined,
    } as CrearPlanillaData,
  });

  async function handleCreate(data: CrearPlanillaData) {
    setLoading(true);
    try {
      const result = await crearPlanilla(data);
      if (result.success) {
        toast.success(result.message);
        setShowCreate(false);
        reset();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al crear planilla");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnular() {
    if (!anularId) return;
    setLoading(true);
    try {
      const result = await anularPlanilla(anularId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al anular planilla");
    } finally {
      setLoading(false);
      setAnularId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground text-sm">
          {planillas.length} planilla
          {planillas.length !== 1 ? "s" : ""} registrada
          {planillas.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva planilla
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Empleados</TableHead>
                <TableHead className="text-right">Total bruto</TableHead>
                <TableHead className="text-right">Total neto</TableHead>
                <TableHead>Creada por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planillas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    No hay planillas registradas
                  </TableCell>
                </TableRow>
              ) : (
                planillas.map((p) => (
                  <TableRow key={p.planilla.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {p.planilla.fechaInicio} — {p.planilla.fechaFin}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {p.planilla.tipo}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          estadoVariant[p.planilla.estado] || "secondary"
                        }
                      >
                        {estadoLabel[p.planilla.estado] || p.planilla.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.planilla.totalEmpleados}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(p.planilla.totalSalariosBrutos)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ¢{fmtCRC(p.planilla.totalSalariosNeto)}
                    </TableCell>
                    <TableCell>{p.creadoPorNombre}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/dashboard/payroll/${p.planilla.id}`,
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {p.planilla.estado === "borrador" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAnularId(p.planilla.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva planilla</DialogTitle>
            <DialogDescription>
              Seleccioná el período y tipo. El sistema calculará automáticamente
              los detalles para todos los empleados activos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Tipo de planilla</FieldLabel>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel>Fecha inicio</FieldLabel>
                <Input type="date" {...register("fechaInicio")} />
              </Field>

              <Field>
                <FieldLabel>Fecha fin</FieldLabel>
                <Input type="date" {...register("fechaFin")} />
              </Field>

              <Field>
                <FieldLabel>Nota (opcional)</FieldLabel>
                <Input
                  {...register("nota")}
                  placeholder="Nota interna..."
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Generando..." : "Generar planilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!anularId} onOpenChange={() => setAnularId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular planilla</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará la planilla. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAnular} disabled={loading}>
              Anular planilla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
