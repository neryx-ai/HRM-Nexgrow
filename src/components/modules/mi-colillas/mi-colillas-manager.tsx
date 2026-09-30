"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Receipt, CalendarDays, Download, Loader2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { exportarMiColillaPdf } from "@/actions/colilla-pdf.actions";
import type { MiColillaResumen } from "@/actions/mi-colilla.actions";
import { formatPeriodoLabel } from "@/lib/periodo";

interface EmpleadoResumen {
  nombre: string;
  apellidos: string;
  cedula: string;
}

interface MiColillasManagerProps {
  empleado: EmpleadoResumen;
  colillas: MiColillaResumen[];
}

function fmtCRC(n: string): string {
  return parseFloat(n).toLocaleString("es-CR", {
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

const estadoLabel: Record<string, string> = {
  borrador: "Borrador",
  procesada: "Procesada",
  anulada: "Anulada",
};

const tipoLabel: Record<string, string> = {
  mensual: "Mensual",
  quincenal: "Quincenal",
};

export function MiColillasManager({
  empleado,
  colillas,
}: MiColillasManagerProps) {
  const [descargandoPorId, setDescargandoPorId] = useState<Record<string, boolean>>({});

  async function handleDownload(detalleId: string, label: string) {
    setDescargandoPorId((prev) => ({ ...prev, [detalleId]: true }));
    try {
      const result = await exportarMiColillaPdf(detalleId);
      if (result.success && result.data) {
        const d = result.data as {
          base64: string;
          filename: string;
          contentType: string;
        };
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Mis colillas</h1>
        <p className="text-sm text-muted-foreground">
          {empleado.nombre} {empleado.apellidos} · Cédula{" "}
          <span className="font-mono">{empleado.cedula}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Historial de pagos ({colillas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-4">
          {colillas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aún no tenés colillas procesadas.</p>
              <p className="text-xs mt-1">
                Cuando RRHH confirme una planilla, vas a ver acá el detalle de
                tu pago.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Ded. legales</TableHead>
                  <TableHead className="text-right">Ded. adicionales</TableHead>
                  <TableHead className="text-right font-semibold">
                    Neto
                  </TableHead>
                  <TableHead>Fecha de pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colillas.map((c) => (
                  <TableRow key={c.detalleId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatPeriodoLabel(c.tipo, c.fechaInicio, c.fechaFin)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {tipoLabel[c.tipo] ?? c.tipo}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={estadoVariant[c.estado] || "secondary"}
                      >
                        {estadoLabel[c.estado] ?? c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(c.salarioBruto)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(c.totalDeduccionesLegales)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ¢{fmtCRC(c.totalDeduccionesAdicionales)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-emerald-600">
                      ¢{fmtCRC(c.salarioNeto)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.fechaPago ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/dashboard/colillas/${c.detalleId}/preview`}
                          >
                            <Eye className="h-4 w-4 text-violet-500" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Descargar PDF"
                          disabled={descargandoPorId[c.detalleId]}
                          onClick={() =>
                            handleDownload(
                              c.detalleId,
                              formatPeriodoLabel(c.tipo, c.fechaInicio, c.fechaFin),
                            )
                          }
                        >
                          {descargandoPorId[c.detalleId] ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                          ) : (
                            <Download className="h-4 w-4 text-emerald-500" />
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
    </div>
  );
}