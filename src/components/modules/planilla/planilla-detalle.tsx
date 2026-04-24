"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  agregarDeduccionAdicional,
  agregarIngresoExtra,
  eliminarDeduccionAdicional,
  eliminarIngresoExtra,
  confirmarPlanilla,
} from "@/actions/planilla.actions";
import {
  exportarPlanillaExcel,
  exportarPlanillaPDF,
} from "@/actions/exportar.actions";

interface DetalleItem {
  detalle: {
    id: string;
    planillaId: string;
    empleadoId: string;
    salarioBruto: string;
    horasOrdinarias: string;
    horasExtra: string;
    montoHorasExtra: string;
    ccssEmpleado: string;
    insEmpleado: string;
    impuestoRenta: string;
    bancoPopular: string;
    totalDeduccionesLegales: string;
    totalDeduccionesAdicionales: string;
    totalIngresosExtras: string;
    salarioNeto: string;
    colillaEnviada: string;
    nota: string | null;
  };
  empleadoNombre: string;
  empleadoApellidos: string;
  empleadoCedula: string;
  sucursalNombre: string | null;
  puestoNombre: string | null;
}

interface DeduccionItem {
  id: string;
  detallePlanillaId: string;
  empleadoId: string;
  concepto: string;
  monto: string;
  tipo: string;
}

interface IngresoItem {
  id: string;
  detallePlanillaId: string;
  empleadoId: string;
  concepto: string;
  monto: string;
  tipo: string;
}

interface PlanillaData {
  id: string;
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string | null;
  totalEmpleados: number;
  totalSalariosBrutos: string;
  totalHorasExtra: string;
  totalBonos: string;
  totalComisiones: string;
  totalDeduccionesLegales: string;
  totalDeduccionesAdicionales: string;
  totalSalariosNeto: string;
  creadoPor: string;
  confirmadoPor: string | null;
  confirmadoEn: Date | null;
  nota: string | null;
  createdAt: Date;
}

function fmtCRC(n: string | number) {
  return parseFloat(String(n)).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type ModalMode = "deduccion" | "ingreso" | "confirmar" | null;

export function PlanillaDetalle({
  planilla: p,
  detalles,
  deducciones,
  ingresos,
}: {
  planilla: PlanillaData;
  detalles: DetalleItem[];
  deducciones: DeduccionItem[];
  ingresos: IngresoItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDetalle, setSelectedDetalle] = useState<DetalleItem | null>(
    null,
  );
  const [formData, setFormData] = useState({
    concepto: "",
    monto: "",
    tipo: "otro",
    fechaPago: "",
  });

  const isBorrador = p.estado === "borrador";

  const deduccionesPorDetalle = (detalleId: string) =>
    deducciones.filter((d) => d.detallePlanillaId === detalleId);

  const ingresosPorDetalle = (detalleId: string) =>
    ingresos.filter((i) => i.detallePlanillaId === detalleId);

  async function handleAddDeduccion() {
    if (!selectedDetalle) return;
    setLoading(true);
    try {
      const result = await agregarDeduccionAdicional({
        detallePlanillaId: selectedDetalle.detalle.id,
        empleadoId: selectedDetalle.detalle.empleadoId,
        concepto: formData.concepto,
        monto: formData.monto,
        tipo: formData.tipo,
      });
      if (result.success) {
        toast.success(result.message);
        setModalMode(null);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al agregar deducción");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddIngreso() {
    if (!selectedDetalle) return;
    setLoading(true);
    try {
      const result = await agregarIngresoExtra({
        detallePlanillaId: selectedDetalle.detalle.id,
        empleadoId: selectedDetalle.detalle.empleadoId,
        concepto: formData.concepto,
        monto: formData.monto,
        tipo: formData.tipo,
      });
      if (result.success) {
        toast.success(result.message);
        setModalMode(null);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al agregar ingreso extra");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDeduccion(id: string) {
    setLoading(true);
    try {
      const result = await eliminarDeduccionAdicional(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al eliminar deducción");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteIngreso(id: string) {
    setLoading(true);
    try {
      const result = await eliminarIngresoExtra(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al eliminar ingreso extra");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const result = await confirmarPlanilla({
        planillaId: p.id,
        fechaPago: formData.fechaPago,
      });
      if (result.success) {
        toast.success(result.message);
        setModalMode(null);
        resetForm();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al confirmar planilla");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ concepto: "", monto: "", tipo: "otro", fechaPago: "" });
    setSelectedDetalle(null);
  }

  async function handleExportExcel() {
    setLoading(true);
    try {
      const result = await exportarPlanillaExcel(p.id);
      if (result.success && result.data) {
        const d = result.data as { base64: string; filename: string; contentType: string };
        const binary = atob(d.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: d.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = d.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Excel descargado");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al exportar Excel");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    setLoading(true);
    try {
      const result = await exportarPlanillaPDF(p.id);
      if (result.success && result.data) {
        const d = result.data as { base64: string; filename: string; contentType: string };
        const binary = atob(d.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: d.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = d.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF descargado");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al exportar PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/payroll")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              Planilla {p.tipo === "mensual" ? "Mensual" : "Quincenal"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {p.fechaInicio} — {p.fechaFin}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              p.estado === "procesada"
                ? "default"
                : p.estado === "anulada"
                  ? "destructive"
                  : "outline"
            }
          >
            {p.estado === "borrador"
              ? "Borrador"
              : p.estado === "procesada"
                ? "Procesada"
                : "Anulada"}
          </Badge>
          {isBorrador && (
            <Button
              onClick={() => {
                setFormData((f) => ({ ...f, fechaPago: "" }));
                setModalMode("confirmar");
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Confirmar planilla
            </Button>
          )}
          <Button variant="outline" onClick={handleExportExcel} disabled={loading}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              Total empleados
            </p>
            <p className="text-xl font-bold">{p.totalEmpleados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              Total salarios brutos
            </p>
            <p className="text-xl font-bold">
              ¢{fmtCRC(p.totalSalariosBrutos)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              Total deducciones
            </p>
            <p className="text-xl font-bold text-destructive">
              ¢
              {fmtCRC(
                (
                  parseFloat(p.totalDeduccionesLegales) +
                  parseFloat(p.totalDeduccionesAdicionales)
                ).toFixed(2),
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              Total salarios netos
            </p>
            <p className="text-xl font-bold text-emerald-600">
              ¢{fmtCRC(p.totalSalariosNeto)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por empleado</CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead className="text-right">Salario bruto</TableHead>
                <TableHead className="text-right">H.E.</TableHead>
                <TableHead className="text-right">Ingresos extra</TableHead>
                <TableHead className="text-right">Ded. legales</TableHead>
                <TableHead className="text-right">Ded. adicionales</TableHead>
                <TableHead className="text-right font-semibold">
                  Neto
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalles.map((d) => {
                const deds = deduccionesPorDetalle(d.detalle.id);
                const ings = ingresosPorDetalle(d.detalle.id);

                return (
                  <TableRow key={d.detalle.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {d.empleadoNombre} {d.empleadoApellidos}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.empleadoCedula}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.puestoNombre || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(d.detalle.salarioBruto)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(d.detalle.horasExtra) > 0
                        ? `${d.detalle.horasExtra}h / ¢${fmtCRC(d.detalle.montoHorasExtra)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(d.detalle.totalIngresosExtras) > 0 ? (
                        <div>
                          <span>
                            ¢{fmtCRC(d.detalle.totalIngresosExtras)}
                          </span>
                          {ings.map((i) => (
                            <p
                              key={i.id}
                              className="text-xs text-muted-foreground"
                            >
                              {i.concepto}: ¢{fmtCRC(i.monto)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div>
                        <span>
                          ¢{fmtCRC(d.detalle.totalDeduccionesLegales)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          CCSS ¢{fmtCRC(d.detalle.ccssEmpleado)} · Renta ¢
                          {fmtCRC(d.detalle.impuestoRenta)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(d.detalle.totalDeduccionesAdicionales) > 0 ? (
                        <div>
                          <span>
                            ¢{fmtCRC(d.detalle.totalDeduccionesAdicionales)}
                          </span>
                          {deds.map((dd) => (
                            <p
                              key={dd.id}
                              className="text-xs text-muted-foreground flex items-center justify-end gap-1"
                            >
                              {dd.concepto}: ¢{fmtCRC(dd.monto)}
                              {isBorrador && (
                                <button
                                  onClick={() => handleDeleteDeduccion(dd.id)}
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </p>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-emerald-600">
                      ¢{fmtCRC(d.detalle.salarioNeto)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isBorrador && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Agregar deducción"
                            onClick={() => {
                              setSelectedDetalle(d);
                              setFormData({
                                concepto: "",
                                monto: "",
                                tipo: "otro",
                                fechaPago: "",
                              });
                              setModalMode("deduccion");
                            }}
                          >
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Agregar ingreso extra"
                            onClick={() => {
                              setSelectedDetalle(d);
                              setFormData({
                                concepto: "",
                                monto: "",
                                tipo: "otro",
                                fechaPago: "",
                              });
                              setModalMode("ingreso");
                            }}
                          >
                            <Plus className="h-4 w-4 text-emerald-500" />
                          </Button>
                        </div>
                      )}
                      {p.estado === "procesada" && d.detalle.colillaEnviada === "1" && (
                        <span title="Colilla enviada">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={modalMode === "deduccion"}
        onOpenChange={() => {
          setModalMode(null);
          resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar deducción</DialogTitle>
            <DialogDescription>
              {selectedDetalle &&
                `${selectedDetalle.empleadoNombre} ${selectedDetalle.empleadoApellidos}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Concepto</FieldLabel>
                <Input
                  value={formData.concepto}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, concepto: e.target.value }))
                  }
                  placeholder="Ej: Préstamo personal"
                />
              </Field>
              <Field>
                <FieldLabel>Monto (¢)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, monto: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, tipo: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prestamo">Préstamo</SelectItem>
                    <SelectItem value="dano">Daño</SelectItem>
                    <SelectItem value="descuento_judicial">
                      Descuento judicial
                    </SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalMode(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddDeduccion}
              disabled={loading || !formData.concepto || !formData.monto}
            >
              {loading ? "Agregando..." : "Agregar deducción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalMode === "ingreso"}
        onOpenChange={() => {
          setModalMode(null);
          resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar ingreso extra</DialogTitle>
            <DialogDescription>
              {selectedDetalle &&
                `${selectedDetalle.empleadoNombre} ${selectedDetalle.empleadoApellidos}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Concepto</FieldLabel>
                <Input
                  value={formData.concepto}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, concepto: e.target.value }))
                  }
                  placeholder="Ej: Bono de productividad"
                />
              </Field>
              <Field>
                <FieldLabel>Monto (¢)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, monto: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, tipo: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bono">Bono</SelectItem>
                    <SelectItem value="comision">Comisión</SelectItem>
                    <SelectItem value="horas_extra_doble">
                      Horas extra doble
                    </SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalMode(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddIngreso}
              disabled={loading || !formData.concepto || !formData.monto}
            >
              {loading ? "Agregando..." : "Agregar ingreso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalMode === "confirmar"}
        onOpenChange={() => {
          setModalMode(null);
          resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar planilla</DialogTitle>
            <DialogDescription>
              Al confirmar, la planilla se bloqueará y se enviarán las colillas
              de pago por email a cada empleado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Fecha de pago</FieldLabel>
                <Input
                  type="date"
                  value={formData.fechaPago}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, fechaPago: e.target.value }))
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalMode(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !formData.fechaPago}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Procesando..." : "Confirmar y enviar colillas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
