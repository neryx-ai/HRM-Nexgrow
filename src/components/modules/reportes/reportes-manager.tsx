"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileBarChart,
  Download,
  Filter,
  Clock,
  DollarSign,
  Users,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  getReporteAsistencia,
  getReporteCostosSucursal,
  getReportePlanilla,
  getMetricasRRHH,
} from "@/actions/reportes.actions";
import {
  exportarReporteAsistenciaExcel,
  exportarReporteAsistenciaPDF,
  exportarReporteCostosExcel,
  exportarReporteCostosPDF,
} from "@/actions/exportar-reportes.actions";
import { getSucursales } from "@/actions/sucursal.actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "hsl(220, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
];

function fmtCRC(n: string | number) {
  return parseFloat(String(n)).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtTime(date: Date | string | null) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TabType = "asistencia" | "costos" | "planilla" | "rrhh";

function downloadFile(base64: string, filename: string, contentType: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportesManager() {
  const [tab, setTab] = useState<TabType>("asistencia");
  const [loading, setLoading] = useState(false);

  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [fechaFin, setFechaFin] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [sucursalId, setSucursalId] = useState<string>("all");
  const [sucursales, setSucursales] = useState<
    { id: string; nombre: string }[]
  >([]);

  const [reporteData, setReporteData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function loadSucursales() {
      const result = await getSucursales();
      if (result.success && result.data) {
        const data = result.data as { sucursales: { id: string; nombre: string }[] };
        setSucursales(data.sucursales || []);
      }
    }
    loadSucursales();
  }, []);

  async function generarReporte() {
    setLoading(true);
    setReporteData(null);
    try {
      let result;
      const filtroSucursal = sucursalId === "all" ? undefined : sucursalId;

      switch (tab) {
        case "asistencia":
          result = await getReporteAsistencia(
            fechaInicio,
            fechaFin,
            filtroSucursal,
          );
          break;
        case "costos":
          result = await getReporteCostosSucursal(fechaInicio, fechaFin);
          break;
        case "planilla":
          result = await getReportePlanilla(fechaInicio, fechaFin);
          break;
        case "rrhh":
          result = await getMetricasRRHH();
          break;
      }

      if (result?.success && result.data) {
        setReporteData(result.data as Record<string, unknown>);
      } else {
        toast.error(result?.message || "Error al generar reporte");
      }
    } catch {
      toast.error("Error al generar reporte");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "excel" | "pdf") {
    try {
      let result;
      const filtroSucursal = sucursalId === "all" ? undefined : sucursalId;

      switch (tab) {
        case "asistencia":
          result =
            format === "excel"
              ? await exportarReporteAsistenciaExcel(
                  fechaInicio,
                  fechaFin,
                  filtroSucursal,
                )
              : await exportarReporteAsistenciaPDF(
                  fechaInicio,
                  fechaFin,
                  filtroSucursal,
                );
          break;
        case "costos":
          result =
            format === "excel"
              ? await exportarReporteCostosExcel(fechaInicio, fechaFin)
              : await exportarReporteCostosPDF(fechaInicio, fechaFin);
          break;
        default:
          toast.info("Exportación disponible para asistencia y costos");
          return;
      }

      if (result?.success && result.data) {
        const d = result.data as {
          base64: string;
          filename: string;
          contentType: string;
        };
        downloadFile(d.base64, d.filename, d.contentType);
        toast.success("Archivo descargado");
      } else {
        toast.error(result?.message || "Error al exportar");
      }
    } catch {
      toast.error("Error al exportar");
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "asistencia", label: "Asistencia", icon: Clock },
    { id: "costos", label: "Costos por sucursal", icon: Building2 },
    { id: "planilla", label: "Planilla", icon: DollarSign },
    { id: "rrhh", label: "Métricas RRHH", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTab(t.id);
              setReporteData(null);
            }}
            className="whitespace-nowrap"
          >
            <t.icon className="size-4 mr-2" />
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            {tab !== "rrhh" && (
              <>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Fecha inicio
                  </label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    Fecha fin
                  </label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-40"
                  />
                </div>
                {tab === "asistencia" && (
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      Sucursal
                    </label>
                    <Select
                      value={sucursalId}
                      onValueChange={setSucursalId}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {sucursales.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            <Button onClick={generarReporte} disabled={loading}>
              <FileBarChart className="size-4 mr-2" />
              {loading ? "Generando..." : "Generar reporte"}
            </Button>
            {reporteData && tab !== "rrhh" && tab !== "planilla" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("excel")}
                >
                  <Download className="size-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf")}
                >
                  <Download className="size-4 mr-1" />
                  PDF
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {reporteData && tab === "asistencia" && (
        <ReporteAsistencia data={reporteData} />
      )}
      {reporteData && tab === "costos" && <ReporteCostos data={reporteData} />}
      {reporteData && tab === "planilla" && (
        <ReportePlanilla data={reporteData} />
      )}
      {reporteData && tab === "rrhh" && <MetricasRRHH data={reporteData} />}
    </div>
  );
}

function ReporteAsistencia({ data }: { data: Record<string, unknown> }) {
  const registros = data.registros as {
    fecha: string;
    empleadoNombre: string;
    empleadoApellidos: string;
    sucursalNombre: string | null;
    horasOrdinarias: string;
    horasExtra: string;
    ausente: boolean;
    retraso: boolean;
    minutosRetraso: string;
    horaEntrada: string | null;
    horaSalida: string | null;
  }[];
  const resumen = data.resumen as {
    totalRegistros: number;
    totalAusencias: number;
    totalRetrasos: number;
    totalHorasOrdinarias: string;
    totalHorasExtra: string;
    promedioRetrasoMinutos: string;
  };

  const pieData = [
    { name: "Puntuales", value: resumen.totalRegistros - resumen.totalAusencias - resumen.totalRetrasos },
    { name: "Con retraso", value: resumen.totalRetrasos },
    { name: "Ausentes", value: resumen.totalAusencias },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total registros</p>
            <p className="text-2xl font-bold">{resumen.totalRegistros}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ausencias</p>
            <p className="text-2xl font-bold text-destructive">
              {resumen.totalAusencias}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Retrasos</p>
            <p className="text-2xl font-bold text-amber-600">
              {resumen.totalRetrasos}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Horas extra</p>
            <p className="text-2xl font-bold">
              {parseFloat(resumen.totalHorasExtra || "0").toFixed(1)}h
            </p>
          </CardContent>
        </Card>
      </div>

      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de asistencia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={COLORS[idx % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de asistencia</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>H. Ord.</TableHead>
                <TableHead>H. Extra</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Sin registros en el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell>
                      {r.empleadoNombre} {r.empleadoApellidos}
                    </TableCell>
                    <TableCell>{r.sucursalNombre || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {fmtTime(r.horaEntrada)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {fmtTime(r.horaSalida)}
                    </TableCell>
                    <TableCell>{parseFloat(r.horasOrdinarias).toFixed(1)}</TableCell>
                    <TableCell>{parseFloat(r.horasExtra).toFixed(1)}</TableCell>
                    <TableCell>
                      {r.ausente ? (
                        <Badge variant="destructive" className="text-xs">
                          Ausente
                        </Badge>
                      ) : r.retraso ? (
                        <Badge variant="outline" className="text-xs">
                          Retraso ({parseFloat(r.minutosRetraso).toFixed(0)}min)
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Puntual
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReporteCostos({ data }: { data: Record<string, unknown> }) {
  const costos = data.costosPorSucursal as {
    sucursalNombre: string;
    totalBruto: string;
    totalNeto: string;
    totalDeducciones: string;
    totalHorasExtra: string;
    totalEmpleados: number;
  }[];
  const totales = data.totales as {
    totalBruto: string;
    totalNeto: string;
    totalDeducciones: string;
    totalHorasExtra: string;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total bruto</p>
            <p className="text-2xl font-bold">¢{fmtCRC(totales.totalBruto || "0")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total neto</p>
            <p className="text-2xl font-bold">¢{fmtCRC(totales.totalNeto || "0")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total deducciones</p>
            <p className="text-2xl font-bold text-destructive">
              ¢{fmtCRC(totales.totalDeducciones || "0")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total horas extra</p>
            <p className="text-2xl font-bold">
              ¢{fmtCRC(totales.totalHorasExtra || "0")}
            </p>
          </CardContent>
        </Card>
      </div>

      {costos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparativo por sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costos}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="sucursalNombre" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v: number) => `¢${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `¢${fmtCRC(String(v))}`} />
                <Legend />
                <Bar dataKey="totalBruto" name="Bruto" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalNeto" name="Neto" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalDeducciones" name="Deducciones" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Desglose por sucursal</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sucursal</TableHead>
                <TableHead className="text-right">Empleados</TableHead>
                <TableHead className="text-right">Total bruto</TableHead>
                <TableHead className="text-right">Deducciones</TableHead>
                <TableHead className="text-right">H. Extra</TableHead>
                <TableHead className="text-right">Total neto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Sin datos en el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                costos.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {c.sucursalNombre}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.totalEmpleados}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(c.totalBruto)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      ¢{fmtCRC(c.totalDeducciones)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(c.totalHorasExtra)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ¢{fmtCRC(c.totalNeto)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportePlanilla({ data }: { data: Record<string, unknown> }) {
  const planillas = data.planillas as {
    id: string;
    tipo: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    totalEmpleados: number;
    totalSalariosBrutos: string;
    totalHorasExtra: string;
    totalDeduccionesLegales: string;
    totalDeduccionesAdicionales: string;
    totalSalariosNeto: string;
  }[];

  const estadoVariant: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    borrador: "outline",
    procesada: "default",
    anulada: "destructive",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Planillas en el período</CardTitle>
          <CardDescription>
            {planillas.length} planilla
            {planillas.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Empleados</TableHead>
                <TableHead className="text-right">Total bruto</TableHead>
                <TableHead className="text-right">Ded. legales</TableHead>
                <TableHead className="text-right">Ded. adic.</TableHead>
                <TableHead className="text-right">Total neto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planillas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Sin planillas en el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                planillas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.fechaInicio} — {p.fechaFin}
                    </TableCell>
                    <TableCell className="capitalize">{p.tipo}</TableCell>
                    <TableCell>
                      <Badge
                        variant={estadoVariant[p.estado] || "secondary"}
                      >
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.totalEmpleados}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(p.totalSalariosBrutos)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      ¢{fmtCRC(p.totalDeduccionesLegales)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      ¢{fmtCRC(p.totalDeduccionesAdicionales)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ¢{fmtCRC(p.totalSalariosNeto)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricasRRHH({ data }: { data: Record<string, unknown> }) {
  const totalActivos = data.totalActivos as number;
  const totalInactivos = data.totalInactivos as number;
  const contratacionesRecientes = data.contratacionesRecientes as number;
  const tasaRotacion = data.tasaRotacion as string;
  const empleadosPorSucursal = data.empleadosPorSucursal as {
    sucursalNombre: string;
    activos: number;
    inactivos: number;
  }[];
  const empleadosPorPuesto = data.empleadosPorPuesto as {
    puestoNombre: string;
    total: number;
  }[];
  const antiguedad = data.antiguedad as { rango: string; total: number }[];

  const sucursalChartData = empleadosPorSucursal.map((s) => ({
    name: s.sucursalNombre,
    activos: s.activos,
    inactivos: s.inactivos,
  }));

  const puestoChartData = empleadosPorPuesto.slice(0, 8).map((p) => ({
    name: p.puestoNombre,
    total: p.total,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Empleados activos</p>
            <p className="text-2xl font-bold text-green-600">{totalActivos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Empleados inactivos</p>
            <p className="text-2xl font-bold text-destructive">
              {totalInactivos}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Contrataciones (30 días)
            </p>
            <p className="text-2xl font-bold">{contratacionesRecientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tasa de rotación</p>
            <p className="text-2xl font-bold">{tasaRotacion}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Empleados por sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            {sucursalChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Sin datos
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sucursalChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="activos" name="Activos" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inactivos" name="Inactivos" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empleados por puesto</CardTitle>
          </CardHeader>
          <CardContent>
            {puestoChartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Sin datos
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={puestoChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={11}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="total" name="Empleados" fill={COLORS[1]} radius={[0, 4, 4, 0]}>
                    {puestoChartData.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {antiguedad.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por antigüedad</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rango</TableHead>
                  <TableHead className="text-right">Empleados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {antiguedad.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.rango}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {a.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
