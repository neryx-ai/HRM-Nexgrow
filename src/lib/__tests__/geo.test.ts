import { describe, it, expect } from "vitest";
import {
  haversineMetros,
  esCoordenadaValida,
  evaluarGeocerca,
  esSospechaMockLocation,
} from "../geo";

describe("esCoordenadaValida", () => {
  it("acepta coordenadas dentro de rango", () => {
    expect(esCoordenadaValida(9.93, -84.08)).toBe(true);
    expect(esCoordenadaValida(0, 0)).toBe(true);
    expect(esCoordenadaValida(-90, -180)).toBe(true);
    expect(esCoordenadaValida(90, 180)).toBe(true);
  });

  it("rechaza coordenadas fuera de rango", () => {
    expect(esCoordenadaValida(91, 0)).toBe(false);
    expect(esCoordenadaValida(-91, 0)).toBe(false);
    expect(esCoordenadaValida(0, 181)).toBe(false);
    expect(esCoordenadaValida(0, -181)).toBe(false);
    expect(esCoordenadaValida(Number.NaN, 0)).toBe(false);
    expect(esCoordenadaValida(0, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("haversineMetros", () => {
  it("devuelve 0 para puntos idénticos", () => {
    expect(haversineMetros({ lat: 9.93, lng: -84.08 }, { lat: 9.93, lng: -84.08 })).toBe(0);
  });

  it("devuelve Infinity si alguna coordenada es inválida", () => {
    expect(
      haversineMetros({ lat: 9.93, lng: -84.08 }, { lat: 999, lng: 0 }),
    ).toBe(Infinity);
  });

  it("calcula ~111 km entre grados de latitud en el ecuador", () => {
    const d = haversineMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("antípodas devuelven ~mitad de la circunferencia terrestre", () => {
    const d = haversineMetros({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(d).toBeGreaterThan(20_000_000);
    expect(d).toBeLessThan(20_100_000);
  });

  it("dos puntos a ~1 km en Costa Rica difieren por menos de 50 m", () => {
    // 0.001 grados de latitud ≈ 111 m
    const d = haversineMetros(
      { lat: 9.93, lng: -84.08 },
      { lat: 9.93 + 0.001, lng: -84.08 },
    );
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(130);
  });
});

describe("evaluarGeocerca", () => {
  it("ignora cuando la geocerca está inactiva", () => {
    const r = evaluarGeocerca({
      empleado: { lat: 9.93, lng: -84.08 },
      sucursal: { lat: 10, lng: -84 },
      radioMetros: 50,
      geocercaActiva: false,
    });
    expect(r.dentroGeocerca).toBe(null);
    expect(r.fueraDeGeocerca).toBe(false);
  });

  it("marca dentro cuando la distancia es menor al radio", () => {
    const r = evaluarGeocerca({
      empleado: { lat: 9.93, lng: -84.08 },
      sucursal: { lat: 9.9301, lng: -84.08 },
      radioMetros: 100,
      geocercaActiva: true,
    });
    expect(r.dentroGeocerca).toBe(true);
    expect(r.fueraDeGeocerca).toBe(false);
  });

  it("marca fuera cuando la distancia excede el radio", () => {
    const r = evaluarGeocerca({
      empleado: { lat: 9.93, lng: -84.08 },
      sucursal: { lat: 10, lng: -84 },
      radioMetros: 50,
      geocercaActiva: true,
    });
    expect(r.dentroGeocerca).toBe(false);
    expect(r.fueraDeGeocerca).toBe(true);
    expect(r.distanciaM).toBeGreaterThan(50);
  });

  it("devuelve null cuando no hay coordenadas del empleado", () => {
    const r = evaluarGeocerca({
      empleado: null,
      sucursal: { lat: 10, lng: -84 },
      radioMetros: 50,
      geocercaActiva: true,
    });
    expect(r.dentroGeocerca).toBe(null);
    expect(r.fueraDeGeocerca).toBe(false);
  });
});

describe("esSospechaMockLocation", () => {
  it("marca como sospecha precisión <5 m con velocidad 0", () => {
    expect(esSospechaMockLocation(2, 0)).toBe(true);
  });

  it("no marca sospecha con precisión normal", () => {
    expect(esSospechaMockLocation(15, 0)).toBe(false);
  });

  it("no marca sospecha con velocidad > 0", () => {
    expect(esSospechaMockLocation(2, 5)).toBe(false);
  });

  it("ignora precisiones nulas o inválidas", () => {
    expect(esSospechaMockLocation(null, 0)).toBe(false);
    expect(esSospechaMockLocation(Number.POSITIVE_INFINITY, 0)).toBe(false);
  });
});
