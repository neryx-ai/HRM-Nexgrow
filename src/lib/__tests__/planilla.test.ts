import { describe, it, expect } from "vitest";
import * as v from "valibot";

const CreateEmpleadoSchema = v.object({
  nombre: v.pipe(v.string(), v.nonEmpty("El nombre es requerido.")),
  apellidos: v.pipe(v.string(), v.nonEmpty("Los apellidos son requeridos.")),
  cedula: v.pipe(v.string(), v.nonEmpty("La cédula es requerida.")),
  email: v.pipe(v.string(), v.email("Email inválido.")),
  telefono: v.pipe(v.string(), v.nonEmpty("El teléfono es requerido.")),
  fechaNacimiento: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")),
  fechaIngreso: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")),
  sucursalId: v.pipe(v.string(), v.nonEmpty()),
  puestoId: v.pipe(v.string(), v.nonEmpty()),
  salarioBase: v.pipe(v.string(), v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido")),
  tipoJornada: v.pipe(v.string(), v.picklist(["completa", "parcial"])),
  horasJornada: v.pipe(v.number(), v.minValue(1), v.maxValue(12)),
  horaEntrada: v.pipe(v.string(), v.regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato HH:MM")),
  horaSalida: v.pipe(v.string(), v.regex(/^\d{2}:\d{2}(:\d{2})?$/, "Formato HH:MM")),
  direccion: v.optional(v.string()),
});

const CrearFeriadoSchema = v.object({
  fecha: v.pipe(v.string(), v.nonEmpty(), v.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido.")),
  nombre: v.pipe(v.string(), v.nonEmpty(), v.maxLength(150)),
  tipo: v.pipe(v.string(), v.picklist(["nacional", "religioso", "opcional"])),
});

const CrearTramoRentaSchema = v.object({
  limiteInferior: v.pipe(v.string(), v.nonEmpty(), v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido.")),
  limiteSuperior: v.optional(v.pipe(v.string(), v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido."))),
  porcentaje: v.pipe(v.string(), v.nonEmpty(), v.regex(/^\d+(\.\d{1,2})?$/, "Porcentaje inválido.")),
  montoExcedente: v.pipe(v.string(), v.nonEmpty(), v.regex(/^\d+(\.\d{1,2})?$/, "Monto inválido.")),
  descripcion: v.optional(v.pipe(v.string(), v.maxLength(200))),
});

const UpdateDeduccionSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  valor: v.pipe(v.string(), v.nonEmpty(), v.regex(/^\d+(\.\d{1,6})?$/, "Valor numérico inválido.")),
});

function calcularTotalesPlanilla(
  detalles: { salarioBruto: string; montoHorasExtra: string; totalDeduccionesLegales: string; salarioNeto: string }[],
  ingresosExtras: number[],
  deduccionesAdicionales: number[],
) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const formatCurrency = (n: number) => round2(n).toFixed(2);
  let totalSalariosBrutos = 0, totalHorasExtra = 0, totalBonos = 0;
  const totalComisiones = 0;
  let totalDeduccionesLegales = 0, totalDeduccionesAdicionalesSum = 0, totalSalariosNeto = 0;
  for (let i = 0; i < detalles.length; i++) {
    const d = detalles[i];
    totalSalariosBrutos += parseFloat(d.salarioBruto);
    totalHorasExtra += parseFloat(d.montoHorasExtra);
    totalDeduccionesLegales += parseFloat(d.totalDeduccionesLegales);
    totalDeduccionesAdicionalesSum += deduccionesAdicionales[i] || 0;
    totalSalariosNeto += parseFloat(d.salarioNeto);
    if (ingresosExtras[i]) totalBonos += ingresosExtras[i];
  }
  return {
    totalEmpleados: detalles.length,
    totalSalariosBrutos: formatCurrency(totalSalariosBrutos),
    totalHorasExtra: formatCurrency(totalHorasExtra),
    totalBonos: formatCurrency(totalBonos),
    totalComisiones: formatCurrency(totalComisiones),
    totalDeduccionesLegales: formatCurrency(totalDeduccionesLegales),
    totalDeduccionesAdicionales: formatCurrency(totalDeduccionesAdicionalesSum),
    totalSalariosNeto: formatCurrency(totalSalariosNeto),
  };
}

function calcularImpuestoRenta(salarioGravable: number, tramos: { limiteInferior: string; limiteSuperior: string | null; porcentaje: string; montoExcedente: string }[]) {
  for (const tramo of tramos) {
    const inferior = parseFloat(tramo.limiteInferior);
    const superior = tramo.limiteSuperior ? parseFloat(tramo.limiteSuperior) : Infinity;
    const porcentaje = parseFloat(tramo.porcentaje) / 100;
    const excedente = parseFloat(tramo.montoExcedente);
    if (salarioGravable >= inferior && salarioGravable <= superior) {
      return Math.round((excedente + (salarioGravable - inferior) * porcentaje) * 100) / 100;
    }
  }
  return 0;
}

describe("CreateEmpleadoSchema", () => {
  it("rejects empty data", () => {
    const result = v.safeParse(CreateEmpleadoSchema, {});
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = v.safeParse(CreateEmpleadoSchema, {
      nombre: "Juan", apellidos: "Pérez", cedula: "123456789",
      email: "not-an-email", telefono: "8888-8888",
      fechaNacimiento: "1990-01-01", fechaIngreso: "2026-01-01",
      sucursalId: "uuid-1", puestoId: "uuid-2",
      salarioBase: "350000", tipoJornada: "completa",
      horasJornada: 8, horaEntrada: "08:00", horaSalida: "17:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid data", () => {
    const result = v.safeParse(CreateEmpleadoSchema, {
      nombre: "Juan", apellidos: "Pérez", cedula: "123456789",
      email: "juan@test.com", telefono: "8888-8888",
      fechaNacimiento: "1990-01-01", fechaIngreso: "2026-01-01",
      sucursalId: "uuid-1", puestoId: "uuid-2",
      salarioBase: "350000", tipoJornada: "completa",
      horasJornada: 8, horaEntrada: "08:00", horaSalida: "17:00",
    });
    expect(result.success).toBe(true);
  });
});

describe("CrearFeriadoSchema", () => {
  it("rejects empty data", () => {
    const result = v.safeParse(CrearFeriadoSchema, {});
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = v.safeParse(CrearFeriadoSchema, {
      fecha: "not-a-date", nombre: "Test", tipo: "nacional",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid data", () => {
    const result = v.safeParse(CrearFeriadoSchema, {
      fecha: "2026-12-25", nombre: "Navidad", tipo: "nacional",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = v.safeParse(CrearFeriadoSchema, {
      fecha: "2026-12-25", nombre: "Test", tipo: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("CrearTramoRentaSchema", () => {
  it("rejects non-numeric values", () => {
    const result = v.safeParse(CrearTramoRentaSchema, {
      limiteInferior: "abc", porcentaje: "10", montoExcedente: "0",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid data", () => {
    const result = v.safeParse(CrearTramoRentaSchema, {
      limiteInferior: "0", limiteSuperior: "941000",
      porcentaje: "0", montoExcedente: "0", descripcion: "Exento",
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateDeduccionSchema", () => {
  it("accepts valid decimal value", () => {
    const result = v.safeParse(UpdateDeduccionSchema, {
      id: "uuid", valor: "0.0917",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric value", () => {
    const result = v.safeParse(UpdateDeduccionSchema, {
      id: "uuid", valor: "abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("calcularTotalesPlanilla", () => {
  it("returns zero for empty array", () => {
    const result = calcularTotalesPlanilla([], [], []);
    expect(result.totalEmpleados).toBe(0);
    expect(result.totalSalariosBrutos).toBe("0.00");
    expect(result.totalSalariosNeto).toBe("0.00");
  });

  it("calculates totals for single employee", () => {
    const result = calcularTotalesPlanilla([{
      salarioBruto: "500000.00", montoHorasExtra: "0.00",
      totalDeduccionesLegales: "53350.00", salarioNeto: "446650.00",
    }], [0], [0]);
    expect(result.totalEmpleados).toBe(1);
    expect(result.totalSalariosBrutos).toBe("500000.00");
    expect(result.totalSalariosNeto).toBe("446650.00");
  });
});

describe("calcularImpuestoRenta", () => {
  it("returns 0 for salary below first bracket", () => {
    const tramos = [
      { limiteInferior: "0", limiteSuperior: "941000", porcentaje: "0", montoExcedente: "0" },
    ];
    expect(calcularImpuestoRenta(500000, tramos)).toBe(0);
  });

  it("calculates tax for second bracket", () => {
    const tramos = [
      { limiteInferior: "0", limiteSuperior: "941000", porcentaje: "0", montoExcedente: "0" },
      { limiteInferior: "941001", limiteSuperior: "1381000", porcentaje: "10", montoExcedente: "0" },
      { limiteInferior: "1381001", limiteSuperior: "2423000", porcentaje: "15", montoExcedente: "44000" },
    ];
    const result = calcularImpuestoRenta(1500000, tramos);
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(44000 + (1500000 - 1381001) * 0.15);
  });
});
