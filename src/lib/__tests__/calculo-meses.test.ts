import { describe, expect, it } from "vitest";
import {
  calcularMesesCumplidos,
  diasDevengados,
  fechaHoyLocal,
} from "@/lib/calculo-meses";

describe("calcularMesesCumplidos", () => {
  describe("casos del JSDoc original", () => {
    it("ingreso 10/01, ref 09/02 → 0 meses (no llegó al 10)", () => {
      expect(calcularMesesCumplidos("2025-01-10", "2025-02-09")).toBe(0);
    });

    it("ingreso 10/01, ref 10/02 → 1 mes", () => {
      expect(calcularMesesCumplidos("2025-01-10", "2025-02-10")).toBe(1);
    });

    it("ingreso 31/01, ref 28/02 → 0 meses (febrero no tiene 31)", () => {
      expect(calcularMesesCumplidos("2025-01-31", "2025-02-28")).toBe(0);
    });

    it("ingreso 31/01, ref 31/03 → 2 meses", () => {
      expect(calcularMesesCumplidos("2025-01-31", "2025-03-31")).toBe(2);
    });
  });

  describe("casos del usuario (08/02 → 09/03)", () => {
    it("ingreso 08/02, ref 09/03 → 1 mes (aniversario ya cumplido)", () => {
      expect(calcularMesesCumplidos("2025-02-08", "2025-03-09")).toBe(1);
    });

    it("ingreso 08/02, ref 08/03 → 1 mes (aniversario exacto)", () => {
      expect(calcularMesesCumplidos("2025-02-08", "2025-03-08")).toBe(1);
    });

    it("ingreso 08/02, ref 07/03 → 0 meses (1 día antes del aniversario)", () => {
      expect(calcularMesesCumplidos("2025-02-08", "2025-03-07")).toBe(0);
    });
  });

  describe("casos de cambio de año", () => {
    it("ingreso 15/12/2024, ref 15/01/2025 → 1 mes", () => {
      expect(calcularMesesCumplidos("2024-12-15", "2025-01-15")).toBe(1);
    });

    it("ingreso 15/12/2024, ref 14/01/2025 → 0 meses", () => {
      expect(calcularMesesCumplidos("2024-12-15", "2025-01-14")).toBe(0);
    });

    it("ingreso 15/12/2024, ref 14/12/2025 → 11 meses", () => {
      expect(calcularMesesCumplidos("2024-12-15", "2025-12-14")).toBe(11);
    });

    it("ingreso 15/12/2024, ref 15/12/2025 → 12 meses", () => {
      expect(calcularMesesCumplidos("2024-12-15", "2025-12-15")).toBe(12);
    });
  });

  describe("casos de meses con menos días (febrero)", () => {
    it("ingreso 31/01, ref 31/03 → 2 meses (saltea febrero)", () => {
      expect(calcularMesesCumplidos("2025-01-31", "2025-03-31")).toBe(2);
    });

    it("ingreso 31/01, ref 30/04 → 2 meses (sigue contando abril normal)", () => {
      expect(calcularMesesCumplidos("2025-01-31", "2025-04-30")).toBe(2);
    });

    it("ingreso 30/01, ref 01/03 → 1 mes", () => {
      expect(calcularMesesCumplidos("2025-01-30", "2025-03-01")).toBe(1);
    });

    it("ingreso 29/01, ref 01/03 → 1 mes", () => {
      expect(calcularMesesCumplidos("2025-01-29", "2025-03-01")).toBe(1);
    });

    it("ingreso 28/02 (año bisiesto), ref 28/03 → 1 mes", () => {
      expect(calcularMesesCumplidos("2024-02-28", "2024-03-28")).toBe(1);
    });
  });

  describe("regresión: bug de timezone UTC-6", () => {
    it("la fecha de referencia string no debe shift-earse por UTC", () => {
      expect(calcularMesesCumplidos("2025-02-08", "2025-03-08")).toBe(1);
      expect(calcularMesesCumplidos("2025-02-08", "2025-03-07")).toBe(0);
    });
  });

  describe("casos borde e inválidos", () => {
    it("fecha de ingreso futura → 0 meses", () => {
      expect(calcularMesesCumplidos("2099-12-31", "2025-01-01")).toBe(0);
    });

    it("fecha de referencia anterior al ingreso → 0 meses", () => {
      expect(calcularMesesCumplidos("2025-03-01", "2025-01-01")).toBe(0);
    });

    it("misma fecha → 0 meses", () => {
      expect(calcularMesesCumplidos("2025-01-15", "2025-01-15")).toBe(0);
    });

    it("fecha de ingreso inválida → 0", () => {
      expect(calcularMesesCumplidos("invalid", "2025-01-01")).toBe(0);
    });

    it("fecha de referencia inválida → 0", () => {
      expect(calcularMesesCumplidos("2025-01-01", "invalid")).toBe(0);
    });

    it("año anterior a 1900 → 0", () => {
      expect(calcularMesesCumplidos("1899-01-01", "2025-01-01")).toBe(0);
    });
  });

  describe("acepta Date como fecha de referencia", () => {
    it("acepta un Date object", () => {
      expect(calcularMesesCumplidos("2025-01-10", new Date(2025, 1, 10))).toBe(1);
    });

    it("Date inválido → 0", () => {
      expect(calcularMesesCumplidos("2025-01-10", new Date("invalid"))).toBe(0);
    });
  });
});

describe("diasDevengados (alias semántico)", () => {
  it("delega en calcularMesesCumplidos", () => {
    expect(diasDevengados("2025-02-08", "2025-03-09")).toBe(1);
    expect(diasDevengados("2025-02-08", "2025-03-07")).toBe(0);
  });
});

describe("fechaHoyLocal", () => {
  it("retorna formato YYYY-MM-DD", () => {
    expect(fechaHoyLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("retorna la fecha local, no UTC", () => {
    const result = fechaHoyLocal();
    const parts = result.split("-").map(Number);
    const now = new Date();
    expect(parts[0]).toBe(now.getFullYear());
    expect(parts[1]).toBe(now.getMonth() + 1);
    expect(parts[2]).toBe(now.getDate());
  });
});
