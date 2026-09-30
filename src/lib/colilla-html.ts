import type { DeduccionLegalDesglose } from "@/db/schema/detalle-planilla.schema";
import { formatPeriodoLabel } from "./periodo";

export interface ColillaData {
  nombre: string;
  cedula: string;
  sucursal: string | null;
  puesto: string | null;
  periodoInicio: string;
  periodoFin: string;
  fechaPago: string | null;
  tipo: string;
  salarioBruto: string;
  horasExtra: string;
  horasLaboradas: string;
  montoHorasExtra: string;
  totalIngresosExtras: string;
  ingresosExtras: { concepto: string; monto: string }[];
  desgloseDeduccionesLegales: DeduccionLegalDesglose[];
  impuestoRenta: string;
  totalDeduccionesLegales: string;
  totalDeduccionesAdicionales: string;
  deduccionesAdicionales: { concepto: string; monto: string }[];
  salarioNeto: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildColillaPagoHtml(data: ColillaData): string {
  const fmt = (n: string) =>
    parseFloat(n).toLocaleString("es-CR", { minimumFractionDigits: 2 });

  const ingresosExtrasRows = data.ingresosExtras
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px;color:#78716c;">${escapeHtml(i.concepto)}</td><td style="padding:4px 8px;text-align:right;">¢${fmt(i.monto)}</td></tr>`,
    )
    .join("");

  const deduccionesLegalesRows = data.desgloseDeduccionesLegales
    .map((d) => {
      const tasa =
        d.tipo === "porcentaje"
          ? ` (${(parseFloat(d.valor) * 100).toFixed(4).replace(/\.?0+$/, "")}%)`
          : "";
      const base =
        d.base === "gravable_renta" ? " (gravable)" : "";
      return `<tr><td style="padding:4px 12px;">${escapeHtml(d.nombre)}${tasa}${base}</td><td style="padding:4px 12px;text-align:right;">¢${fmt(d.monto)}</td></tr>`;
    })
    .join("");

  const deduccionesAdicionalesRows = data.deduccionesAdicionales
    .map(
      (d) =>
        `<tr><td style="padding:4px 8px;color:#78716c;">${escapeHtml(d.concepto)}</td><td style="padding:4px 8px;text-align:right;">¢${fmt(d.monto)}</td></tr>`,
    )
    .join("");

  const horasLaboradasNum = parseFloat(data.horasLaboradas || "0");
  const horasExtraNum = parseFloat(data.horasExtra || "0");

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Colilla de Pago</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr><td style="background-color:#1c1917;padding:24px 40px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">Colilla de Pago — Jivis</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
<h2 style="margin:0 0 16px;color:#1c1917;font-size:18px;">${escapeHtml(data.nombre)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td style="padding:4px 0;color:#78716c;font-size:13px;">Cédula: <strong style="color:#1c1917;">${escapeHtml(data.cedula)}</strong></td>
<td style="padding:4px 0;color:#78716c;font-size:13px;">Puesto: <strong style="color:#1c1917;">${escapeHtml(data.puesto || "—")}</strong></td>
</tr><tr>
<td style="padding:4px 0;color:#78716c;font-size:13px;">Sucursal: <strong style="color:#1c1917;">${escapeHtml(data.sucursal || "—")}</strong></td>
<td style="padding:4px 0;color:#78716c;font-size:13px;">${escapeHtml(formatPeriodoLabel(data.tipo, data.periodoInicio, data.periodoFin))}</td>
</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;margin-bottom:16px;">
<tr>
<td style="padding:10px 14px;width:50%;">
<p style="margin:0 0 2px 0;color:#a8a29e;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Horas laboradas</p>
<p style="margin:0;color:#1c1917;font-size:16px;font-weight:600;">${horasLaboradasNum.toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}h</p>
</td>
<td style="padding:10px 14px;width:50%;">
<p style="margin:0 0 2px 0;color:#a8a29e;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Horas extra</p>
<p style="margin:0;color:#1c1917;font-size:16px;font-weight:600;">${horasExtraNum.toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}h</p>
</td>
</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin-bottom:16px;">
<tr style="background-color:#f5f5f4;"><td colspan="2" style="padding:8px 12px;font-weight:600;color:#1c1917;font-size:14px;">Ingresos</td></tr>
<tr><td style="padding:4px 12px;">Salario bruto</td><td style="padding:4px 12px;text-align:right;">¢${fmt(data.salarioBruto)}</td></tr>
<tr><td style="padding:4px 12px;">Horas extra (${data.horasExtra}h)</td><td style="padding:4px 12px;text-align:right;">¢${fmt(data.montoHorasExtra)}</td></tr>
${ingresosExtrasRows}
<tr style="border-top:1px solid #e7e5e4;"><td style="padding:8px 12px;font-weight:600;">Total ingresos</td><td style="padding:8px 12px;text-align:right;font-weight:600;">¢${fmt((parseFloat(data.salarioBruto) + parseFloat(data.montoHorasExtra) + parseFloat(data.totalIngresosExtras)).toFixed(2))}</td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin-bottom:16px;">
<tr style="background-color:#f5f5f4;"><td colspan="2" style="padding:8px 12px;font-weight:600;color:#1c1917;font-size:14px;">Deducciones Legales</td></tr>
${deduccionesLegalesRows || `<tr><td colspan="2" style="padding:8px 12px;color:#a8a29e;">Sin deducciones legales aplicables</td></tr>`}
<tr><td style="padding:4px 12px;">Impuesto sobre la Renta</td><td style="padding:4px 12px;text-align:right;">¢${fmt(data.impuestoRenta)}</td></tr>
<tr style="border-top:1px solid #e7e5e4;"><td style="padding:8px 12px;font-weight:600;">Total deducciones legales</td><td style="padding:8px 12px;text-align:right;font-weight:600;">¢${fmt(data.totalDeduccionesLegales)}</td></tr>
</table>

${deduccionesAdicionalesRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:6px;margin-bottom:16px;">
<tr style="background-color:#f5f5f4;"><td colspan="2" style="padding:8px 12px;font-weight:600;color:#1c1917;font-size:14px;">Deducciones Adicionales</td></tr>
${deduccionesAdicionalesRows}
<tr style="border-top:1px solid #e7e5e4;"><td style="padding:8px 12px;font-weight:600;">Total deducciones adicionales</td><td style="padding:8px 12px;text-align:right;font-weight:600;">¢${fmt(data.totalDeduccionesAdicionales)}</td></tr>
</table>` : ""}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1c1917;border-radius:6px;margin-top:24px;">
<tr><td style="padding:16px 20px;color:#fff;font-size:18px;font-weight:700;">Salario Neto</td><td style="padding:16px 20px;text-align:right;color:#fff;font-size:18px;font-weight:700;">¢${fmt(data.salarioNeto)}</td></tr>
</table>

${data.fechaPago ? `<p style="margin:16px 0 0;color:#78716c;font-size:13px;">Fecha de pago: ${data.fechaPago}</p>` : ""}
</td></tr>
<tr><td style="background-color:#f5f5f4;padding:16px 40px;text-align:center;">
<p style="margin:0;color:#a8a29e;font-size:12px;">Distribuidora Jivis S.A. — Colilla de pago generada automáticamente</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
