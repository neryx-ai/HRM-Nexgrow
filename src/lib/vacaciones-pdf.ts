export interface BoletaVacacionData {
  empresa: {
    nombre: string;
    telefono: string | null;
  };
  empleado: {
    nombre: string;
    apellidos: string;
    cedula: string;
    puesto: string | null;
    sucursal: string | null;
    fechaIngreso: string;
    email: string | null;
  };
  fechaEmision: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  diasDevengados: number;
  totalOtorgados: number;
  saldoRestante: number;
  motivo: string;
  realizadoPorNombre: string;
  movimientoId: string;
}

export async function generarBoletaVacacionPdf(
  data: BoletaVacacionData,
): Promise<Buffer> {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  doc.setFillColor(28, 25, 23);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.empresa.nombre, margin, 14);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("BOLETA DE VACACIONES OTORGADAS", margin, 22);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Fecha de emisión: ${data.fechaEmision}`,
    pageWidth - margin,
    14,
    { align: "right" },
  );
  doc.text(
    `Folio: ${data.movimientoId.slice(0, 8).toUpperCase()}`,
    pageWidth - margin,
    19,
    { align: "right" },
  );

  let y = 42;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del empleado", margin, y);
  y += 4;

  doc.setLineWidth(0.3);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 70 },
      2: { fontStyle: "bold", cellWidth: 35 },
      3: { cellWidth: 35 },
    },
    body: [
      [
        "Nombre:",
        `${data.empleado.nombre} ${data.empleado.apellidos}`,
        "Cédula:",
        data.empleado.cedula,
      ],
      [
        "Puesto:",
        data.empleado.puesto ?? "—",
        "Sucursal:",
        data.empleado.sucursal ?? "—",
      ],
      [
        "Ingreso:",
        data.empleado.fechaIngreso,
        "Email:",
        data.empleado.email ?? "—",
      ],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Período de vacaciones otorgado", margin, y);
  y += 4;
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  doc.setFont("helvetica", "bold");
  doc.text("Desde:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.fechaInicio, margin + 20, y);

  doc.setFont("helvetica", "bold");
  doc.text("Hasta:", margin + 60, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.fechaFin, margin + 80, y);

  doc.setFont("helvetica", "bold");
  doc.text("Días hábiles:", margin + 125, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(data.dias), margin + 155, y);

  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Motivo:", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  const motivoLines = doc.splitTextToSize(data.motivo, contentWidth);
  doc.text(motivoLines, margin, y);
  y += motivoLines.length * 5 + 4;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  y += 4;
  doc.text("Detalle del saldo", margin, y);
  y += 4;
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: "striped",
    head: [["Concepto", "Días"]],
    body: [
      ["Días devengados a la fecha", String(data.diasDevengados)],
      ["Total días otorgados (histórico)", String(data.totalOtorgados)],
      ["Días otorgados en esta boleta", `-${data.dias}`],
      ["Saldo restante", String(data.saldoRestante)],
    ],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [28, 25, 23], textColor: 255 },
    columnStyles: {
      1: { halign: "right", cellWidth: 30 },
    },
  });

  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

  const signatureY = Math.max(finalY, 230);

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(margin, signatureY, margin + 60, signatureY);
  doc.line(pageWidth - margin - 60, signatureY, pageWidth - margin, signatureY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Autorizado por RRHH", margin, signatureY + 5);
  doc.text(data.realizadoPorNombre, margin, signatureY + 10);

  doc.text("Recibido por el empleado", pageWidth - margin - 60, signatureY + 5);
  doc.text(
    `${data.empleado.nombre} ${data.empleado.apellidos}`,
    pageWidth - margin - 60,
    signatureY + 10,
  );

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Este documento es una boleta oficial de vacaciones otorgadas. Conservar para sus registros.",
    pageWidth / 2,
    285,
    { align: "center" },
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
