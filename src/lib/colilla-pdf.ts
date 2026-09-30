import type { jsPDF } from "jspdf";
import type { ColillaData } from "./colilla-html";
import { formatPeriodoLabel } from "./periodo";

const PAGE_MARGIN_X = 14;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;

const COLORS = {
  ink: "#1c1917",
  muted: "#78716c",
  border: "#e7e5e4",
  bgMuted: "#f5f5f4",
  accent: "#1c1917",
} as const;

const FONT = {
  regular: "helvetica",
  bold: "helvetica",
} as const;

function fmt(n: string): string {
  return parseFloat(n).toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function setColor(doc: jsPDF, hex: string): void {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  doc.setTextColor(r, g, b);
}

function setFill(doc: jsPDF, hex: string): void {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  doc.setFillColor(r, g, b);
}

function setDraw(doc: jsPDF, hex: string): void {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  doc.setDrawColor(r, g, b);
}

interface Cursor {
  y: number;
}

function drawHeaderBand(doc: jsPDF, c: Cursor): void {
  setFill(doc, COLORS.accent);
  doc.rect(0, 0, PAGE_WIDTH, 24, "F");
  doc.setFont(FONT.bold, "bold");
  doc.setFontSize(16);
  setColor(doc, "#ffffff");
  doc.text("Colilla de Pago — Jivis", PAGE_WIDTH / 2, 15, { align: "center" });
  c.y = 32;
}

function drawEmployeeHeader(doc: jsPDF, data: ColillaData, c: Cursor): void {
  doc.setFont(FONT.bold, "bold");
  doc.setFontSize(13);
  setColor(doc, COLORS.ink);
  doc.text(data.nombre, PAGE_MARGIN_X, c.y);
  c.y += 6;

  doc.setFont(FONT.regular, "normal");
  doc.setFontSize(9);
  setColor(doc, COLORS.muted);

  const colW = CONTENT_WIDTH / 2;
  doc.text(`Cédula: ${data.cedula}`, PAGE_MARGIN_X, c.y);
  doc.text(`Puesto: ${data.puesto || "—"}`, PAGE_MARGIN_X + colW, c.y);
  c.y += 4.5;

  doc.text(`Sucursal: ${data.sucursal || "—"}`, PAGE_MARGIN_X, c.y);
  doc.text(
    formatPeriodoLabel(data.tipo, data.periodoInicio, data.periodoFin),
    PAGE_MARGIN_X + colW,
    c.y,
  );
  c.y += 8;
}

function drawSectionTitle(doc: jsPDF, title: string, c: Cursor): void {
  setFill(doc, COLORS.bgMuted);
  doc.rect(PAGE_MARGIN_X, c.y - 4, CONTENT_WIDTH, 6, "F");
  doc.setFont(FONT.bold, "bold");
  doc.setFontSize(10);
  setColor(doc, COLORS.ink);
  doc.text(title, PAGE_MARGIN_X + 2, c.y);
  c.y += 5;
  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_X, c.y - 0.5, PAGE_WIDTH - PAGE_MARGIN_X, c.y - 0.5);
}

function drawRow(
  doc: jsPDF,
  c: Cursor,
  label: string,
  value: string,
  options?: { bold?: boolean; muted?: boolean },
): void {
  doc.setFont(FONT.regular, options?.bold ? "bold" : "normal");
  doc.setFontSize(10);
  setColor(doc, options?.muted ? COLORS.muted : COLORS.ink);
  doc.text(label, PAGE_MARGIN_X + 2, c.y);

  setColor(doc, options?.bold ? COLORS.ink : COLORS.ink);
  doc.text(value, PAGE_WIDTH - PAGE_MARGIN_X - 2, c.y, { align: "right" });
  c.y += 5;
}

function drawKeyValueGrid(doc: jsPDF, c: Cursor, items: [string, string][]): void {
  setFill(doc, "#fafaf9");
  doc.rect(PAGE_MARGIN_X, c.y - 4, CONTENT_WIDTH, 12, "F");
  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(PAGE_MARGIN_X, c.y - 4, CONTENT_WIDTH, 12, "S");

  const halfW = CONTENT_WIDTH / 2;
  items.forEach(([label, value], i) => {
    const offsetX = i % 2 === 0 ? PAGE_MARGIN_X + 2 : PAGE_MARGIN_X + halfW + 2;
    doc.setFont(FONT.regular, "normal");
    doc.setFontSize(8);
    setColor(doc, "#a8a29e");
    doc.text(label.toUpperCase(), offsetX, c.y - 0.5);
    doc.setFont(FONT.bold, "bold");
    doc.setFontSize(11);
    setColor(doc, COLORS.ink);
    doc.text(value, offsetX, c.y + 4.5);
  });
  c.y += 12;
}

function drawTotalRow(doc: jsPDF, c: Cursor, label: string, value: string): void {
  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN_X, c.y - 2, PAGE_WIDTH - PAGE_MARGIN_X, c.y - 2);
  doc.setFont(FONT.bold, "bold");
  doc.setFontSize(10);
  setColor(doc, COLORS.ink);
  doc.text(label, PAGE_MARGIN_X + 2, c.y + 2);
  doc.text(value, PAGE_WIDTH - PAGE_MARGIN_X - 2, c.y + 2, { align: "right" });
  c.y += 7;
}

function drawNetBand(doc: jsPDF, c: Cursor, value: string): void {
  setFill(doc, COLORS.accent);
  doc.rect(PAGE_MARGIN_X, c.y, CONTENT_WIDTH, 12, "F");
  doc.setFont(FONT.bold, "bold");
  doc.setFontSize(13);
  setColor(doc, "#ffffff");
  doc.text("Salario Neto", PAGE_MARGIN_X + 3, c.y + 7.5);
  doc.text(value, PAGE_WIDTH - PAGE_MARGIN_X - 3, c.y + 7.5, { align: "right" });
  c.y += 16;
}

export function buildColillaPdf(doc: jsPDF, data: ColillaData): void {
  const c: Cursor = { y: 0 };

  drawHeaderBand(doc, c);
  drawEmployeeHeader(doc, data, c);

  const horasLaboradasNum = parseFloat(data.horasLaboradas || "0");
  const horasExtraNum = parseFloat(data.horasExtra || "0");
  drawKeyValueGrid(
    doc,
    c,
    [
      ["Horas laboradas", `${horasLaboradasNum.toLocaleString("es-CR", { maximumFractionDigits: 2 })}h`],
      ["Horas extra", `${horasExtraNum.toLocaleString("es-CR", { maximumFractionDigits: 2 })}h`],
    ],
  );

  c.y += 2;
  drawSectionTitle(doc, "Ingresos", c);
  c.y += 2;

  drawRow(doc, c, "Salario bruto", `¢${fmt(data.salarioBruto)}`);
  drawRow(doc, c, `Horas extra (${data.horasExtra}h)`, `¢${fmt(data.montoHorasExtra)}`);
  for (const ing of data.ingresosExtras) {
    drawRow(doc, c, ing.concepto, `¢${fmt(ing.monto)}`, { muted: true });
  }
  drawTotalRow(
    doc,
    c,
    "Total ingresos",
    `¢${fmt(
      (
        parseFloat(data.salarioBruto) +
        parseFloat(data.montoHorasExtra) +
        parseFloat(data.totalIngresosExtras)
      ).toFixed(2),
    )}`,
  );

  c.y += 2;
  drawSectionTitle(doc, "Deducciones Legales", c);
  c.y += 2;

  if (data.desgloseDeduccionesLegales.length === 0) {
    drawRow(doc, c, "Sin deducciones legales aplicables", "—", { muted: true });
  } else {
    for (const d of data.desgloseDeduccionesLegales) {
      const tasa =
        d.tipo === "porcentaje"
          ? ` (${(parseFloat(d.valor) * 100).toFixed(4).replace(/\.?0+$/, "")}%)`
          : "";
      const base = d.base === "gravable_renta" ? " (gravable)" : "";
      drawRow(doc, c, `${d.nombre}${tasa}${base}`, `¢${fmt(d.monto)}`);
    }
  }
  drawRow(doc, c, "Impuesto sobre la Renta", `¢${fmt(data.impuestoRenta)}`);
  drawTotalRow(doc, c, "Total deducciones legales", `¢${fmt(data.totalDeduccionesLegales)}`);

  if (data.deduccionesAdicionales.length > 0) {
    c.y += 2;
    drawSectionTitle(doc, "Deducciones Adicionales", c);
    c.y += 2;
    for (const d of data.deduccionesAdicionales) {
      drawRow(doc, c, d.concepto, `¢${fmt(d.monto)}`, { muted: true });
    }
    drawTotalRow(
      doc,
      c,
      "Total deducciones adicionales",
      `¢${fmt(data.totalDeduccionesAdicionales)}`,
    );
  }

  c.y += 4;
  drawNetBand(doc, c, `¢${fmt(data.salarioNeto)}`);

  if (data.fechaPago) {
    c.y += 2;
    doc.setFont(FONT.regular, "normal");
    doc.setFontSize(9);
    setColor(doc, COLORS.muted);
    doc.text(`Fecha de pago: ${data.fechaPago}`, PAGE_MARGIN_X, c.y);
  }

  doc.setFont(FONT.regular, "normal");
  doc.setFontSize(8);
  setColor(doc, "#a8a29e");
  doc.text(
    "Distribuidora Jivis S.A. — Colilla de pago generada automáticamente",
    PAGE_WIDTH / 2,
    288,
    { align: "center" },
  );

  if (data.email) {
    doc.text(
      `Enviado por correo electrónico a ${data.email}`,
      PAGE_WIDTH / 2,
      293,
      { align: "center" },
    );
  }
}