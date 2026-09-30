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
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  AlertCircle,
  Pencil,
  Eye,
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
  reenviarColillaEmpleado,
  reenviarColillaTodas,
  actualizarHorasLaboradas,
} from "@/actions/planilla.actions";
import {
  exportarPlanillaExcel,
  exportarPlanillaPDF,
} from "@/actions/exportar.actions";
import { exportarColillaPdf } from "@/actions/colilla-pdf.actions";

interface DesgloseLegalItem {
  nombre: string;
  clave: string;
  tipo: "porcentaje" | "monto_fijo";
  base: "total_ingresos" | "gravable_renta";
  valor: string;
  monto: string;
}

interface DetalleItem {
  detalle: {
    id: string;
    planillaId: string;
    empleadoId: string;
    salarioBruto: string;
    horasOrdinarias: string;
    horasExtra: string;
    horasLaboradas: string;
    montoHorasExtra: string;
    desgloseDeduccionesLegales: DesgloseLegalItem[] | null;
    impuestoRenta: string;
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

type ModalMode = "deduccion" | "ingreso" | "confirmar" | "horas" | null;

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
  const [reenviandoTodas, setReenviandoTodas] = useState(false);
  const [reenviandoPorId, setReenviandoPorId] = useState<Record<string, boolean>>({});
  const [descargandoPorId, setDescargandoPorId] = useState<Record<string, boolean>>({});
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDetalle, setSelectedDetalle] = useState<DetalleItem | null>(
    null,
  );
  const [formData, setFormData] = useState({
    concepto: "",
    monto: "",
    tipo: "otro",
    fechaPago: "",
    horasLaboradas: "",
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

  async function handleReenviar(detalleId: string, empleadoLabel: string) {
    setReenviandoPorId((prev) => ({ ...prev, [detalleId]: true }));
    try {
      const result = await reenviarColillaEmpleado({ detallePlanillaId: detalleId });
      if (result.success) {
        toast.success(`Colilla reenviada a ${empleadoLabel}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al reenviar la colilla");
    } finally {
      setReenviandoPorId((prev) => {
        const next = { ...prev };
        delete next[detalleId];
        return next;
      });
    }
  }

  async function handleReenviarTodas() {
    setReenviandoTodas(true);
    try {
      const result = await reenviarColillaTodas({ planillaId: p.id });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.warning(result.message, { duration: 8000 });
        router.refresh();
      }
    } catch {
      toast.error("Error al reenviar las colillas");
    } finally {
      setReenviandoTodas(false);
    }
  }

  function resetForm() {
    setFormData({
      concepto: "",
      monto: "",
      tipo: "otro",
      fechaPago: "",
      horasLaboradas: "",
    });
    setSelectedDetalle(null);
  }

  async function handleUpdateHorasLaboradas() {
    if (!selectedDetalle) return;
    const horas = parseFloat(formData.horasLaboradas);
    if (Number.isNaN(horas) || horas < 0) {
      toast.error("Ingresá un número válido de horas.");
      return;
    }
    setLoading(true);
    try {
      const result = await actualizarHorasLaboradas({
        detallePlanillaId: selectedDetalle.detalle.id,
        horasLaboradas: horas,
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
      toast.error("Error al actualizar horas laboradas");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf(detalleId: string, label: string) {
    setDescargandoPorId((prev) => ({ ...prev, [detalleId]: true }));
    try {
      const result = await exportarColillaPdf(detalleId);
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
        toast.success(`Colilla descargada: ${label}`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Error al descargar la colilla");
    } finally {
      setDescargandoPorId((prev) => {
        const next = { ...prev };
        delete next[detalleId];
        return next;
      });
    }
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
      <div className="flex flex-col items-start gap-4 justify-between">
        <div className="w-full flex items-center justify-between gap-4">
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
        <div className="w-full flex flex-col md:flex-row items-end md:items-center justify-end gap-4">
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
            {p.estado === "procesada" && (
              <Button
                variant="outline"
                onClick={handleReenviarTodas}
                disabled={reenviandoTodas || loading}
              >
                {reenviandoTodas ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Reenviar a todos
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
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
                <TableHead className="text-right">Horas laboradas</TableHead>
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
                              className="text-xs text-muted-foreground flex items-center justify-end gap-1"
                            >
                              {i.concepto}: ¢{fmtCRC(i.monto)}
                              {isBorrador && (
                                <button
                                  onClick={() => handleDeleteIngreso(i.id)}
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
                    <TableCell className="text-right font-mono">
                      <div>
                        <span>
                          ¢{fmtCRC(d.detalle.totalDeduccionesLegales)}
                        </span>
                        {(d.detalle.desgloseDeduccionesLegales ?? []).map(
                          (x) => (
                            <p
                              key={x.clave}
                              className="text-xs text-muted-foreground"
                            >
                              {x.nombre}: ¢{fmtCRC(x.monto)}
                            </p>
                          ),
                        )}
                        <p className="text-xs text-muted-foreground">
                          Renta: ¢{fmtCRC(d.detalle.impuestoRenta)}
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
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-mono text-sm">
                          {fmtCRC(d.detalle.horasLaboradas)}h
                        </span>
                        {isBorrador && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Editar horas laboradas"
                            onClick={() => {
                              setSelectedDetalle(d);
                              setFormData({
                                concepto: "",
                                monto: "",
                                tipo: "otro",
                                fechaPago: "",
                                horasLaboradas:
                                  parseFloat(d.detalle.horasLaboradas).toFixed(
                                    2,
                                  ) || "96",
                              });
                              setModalMode("horas");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
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
                                horasLaboradas: "",
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
                                horasLaboradas: "",
                              });
                              setModalMode("ingreso");
                            }}
                          >
                            <Plus className="h-4 w-4 text-emerald-500" />
                          </Button>
                        </div>
                      )}
                      <div className="flex justify-end items-center gap-1">
                        {p.estado === "procesada" &&
                          (d.detalle.colillaEnviada === "1" ? (
                            <span title="Colilla enviada">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </span>
                          ) : (
                            <span title="Colilla NO enviada — revisar logs">
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            </span>
                          ))}
                        {p.estado === "procesada" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reenviar correo de colilla"
                            disabled={reenviandoPorId[d.detalle.id]}
                            onClick={() =>
                              handleReenviar(
                                d.detalle.id,
                                `${d.empleadoNombre} ${d.empleadoApellidos}`,
                              )
                            }
                          >
                            {reenviandoPorId[d.detalle.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                              <Mail className="h-4 w-4 text-blue-500" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Ver colilla"
                          asChild
                        >
                          <a
                            href={`/dashboard/colillas/${d.detalle.id}/preview`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4 text-violet-500" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Descargar PDF de colilla"
                          disabled={descargandoPorId[d.detalle.id]}
                          onClick={() =>
                            handleDownloadPdf(
                              d.detalle.id,
                              `${d.empleadoNombre} ${d.empleadoApellidos}`,
                            )
                          }
                        >
                          {descargandoPorId[d.detalle.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                          ) : (
                            <Download className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>
                      </div>
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

      <Dialog
        open={modalMode === "horas"}
        onOpenChange={() => {
          setModalMode(null);
          resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar horas laboradas</DialogTitle>
            <DialogDescription>
              {selectedDetalle &&
                `${selectedDetalle.empleadoNombre} ${selectedDetalle.empleadoApellidos}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Horas laboradas del período</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="744"
                  value={formData.horasLaboradas}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      horasLaboradas: e.target.value,
                    }))
                  }
                  placeholder="96"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor por defecto: 96h. Rango permitido: 0–744h.
                </p>
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
              onClick={handleUpdateHorasLaboradas}
              disabled={
                loading ||
                !formData.horasLaboradas ||
                Number.isNaN(parseFloat(formData.horasLaboradas))
              }
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
