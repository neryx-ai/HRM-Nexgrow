"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  UserPlus,
  DollarSign,
  CalendarCheck,
  Eye,
  FileText,
  TreePalm,
  TrendingUp,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardAdminRRHH } from "@/actions/dashboard.actions";
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

const estadoVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  borrador: "outline",
  procesada: "default",
  anulada: "destructive",
};

export function DashboardAdmin() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getDashboardAdminRRHH();
      if (result.success && result.data) {
        setData(result.data as Record<string, unknown>);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-muted-foreground">
        No se pudo cargar la información del dashboard.
      </p>
    );
  }

  const totalActivos = data.totalEmpleadosActivos as number;
  const totalInactivos = data.totalEmpleadosInactivos as number;
  const nuevasContrataciones = data.nuevasContrataciones as number;
  const costoPeriodo = data.costoPeriodo as {
    totalBruto: string;
    totalNeto: string;
  };
  const empleadosPorSucursal = data.empleadosPorSucursal as {
    sucursalNombre: string;
    total: number;
  }[];
  const ultimasPlanillas = data.ultimasPlanillas as {
    id: string;
    tipo: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    totalEmpleados: number;
    totalNeto: string;
  }[];
  const solicitudesPendientes = data.solicitudesVacacionPendientes as number;
  const asistenciaHoy = data.asistenciaHoy as {
    presentes: number;
    ausentes: number;
    retrasos: number;
  };

  const pieData = [
    { name: "Presentes", value: asistenciaHoy?.presentes || 0 },
    { name: "Ausentes", value: asistenciaHoy?.ausentes || 0 },
    { name: "Con retraso", value: asistenciaHoy?.retrasos || 0 },
  ].filter((d) => d.value > 0);

  const cards = [
    {
      title: "Empleados activos",
      value: totalActivos,
      icon: Users,
      description: `${totalInactivos} inactivos`,
      color: "text-blue-600",
    },
    {
      title: "Nuevas contrataciones",
      value: nuevasContrataciones,
      icon: UserPlus,
      description: "Últimos 30 días",
      color: "text-green-600",
    },
    {
      title: "Costo del período",
      value: `¢${fmtCRC(costoPeriodo?.totalNeto || "0")}`,
      icon: DollarSign,
      description: `Bruto: ¢${fmtCRC(costoPeriodo?.totalBruto || "0")}`,
      color: "text-amber-600",
    },
    {
      title: "Vacaciones pendientes",
      value: solicitudesPendientes,
      icon: TreePalm,
      description: "Solicitudes por aprobar",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6 p-2 pr-4 pb-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">
                {card.title}
              </CardDescription>
              <card.icon className={`size-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Empleados por sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {empleadosPorSucursal.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No hay datos disponibles
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={empleadosPorSucursal}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="sucursalNombre"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    name="Empleados"
                    radius={[4, 4, 0, 0]}
                  >
                    {empleadosPorSucursal.map((_, idx) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="size-5" />
              Asistencia hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Sin datos de asistencia para hoy
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Últimas planillas
            </CardTitle>
            <CardDescription>Planillas más recientes</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/payroll">
              <Eye className="size-4 mr-1" />
              Ver todas
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Empleados</TableHead>
                <TableHead className="text-right">Total neto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimasPlanillas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No hay planillas registradas
                  </TableCell>
                </TableRow>
              ) : (
                ultimasPlanillas.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/payroll/${p.id}`)
                    }
                  >
                    <TableCell>
                      {p.fechaInicio} — {p.fechaFin}
                    </TableCell>
                    <TableCell className="capitalize">{p.tipo}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          estadoVariant[p.estado] || "secondary"
                        }
                      >
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.totalEmpleados}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(p.totalNeto)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/dashboard/empleados">
            <Users className="size-6" />
            <span>Gestionar empleados</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/dashboard/vacations">
            <TreePalm className="size-6" />
            <span>Vacaciones ({solicitudesPendientes} pendientes)</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          asChild
        >
          <Link href="/dashboard/reportes">
            <FileText className="size-6" />
            <span>Reportes</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
