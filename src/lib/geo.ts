export interface Coordenada {
  lat: number;
  lng: number;
}

export interface ResultadoGeocerca {
  distanciaM: number;
  dentroGeocerca: boolean | null;
  fueraDeGeocerca: boolean;
}

const RADIO_TIERRA_M = 6_371_000;

export function esCoordenadaValida(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function toRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Distancia en metros entre dos coordenadas geográficas usando la fórmula
 * de Haversine. Suficientemente precisa para geocercas circulares dentro
 * de Costa Rica (diámetro máximo ~300 km).
 */
export function haversineMetros(
  origen: Coordenada,
  destino: Coordenada,
): number {
  if (!esCoordenadaValida(origen.lat, origen.lng)) return Infinity;
  if (!esCoordenadaValida(destino.lat, destino.lng)) return Infinity;

  const dLat = toRadianes(destino.lat - origen.lat);
  const dLng = toRadianes(destino.lng - origen.lng);
  const lat1 = toRadianes(origen.lat);
  const lat2 = toRadianes(destino.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(RADIO_TIERRA_M * c);
}

export interface EvaluarGeocercaInput {
  empleado: Coordenada | null;
  sucursal: Coordenada | null;
  radioMetros: number;
  geocercaActiva: boolean;
}

/**
 * Evalúa si la ubicación del empleado cae dentro de la geocerca de la
 * sucursal. Si la geocerca está inactiva o no hay datos suficientes
 * devuelve `dentroGeocerca = null` (no aplica) y `fueraDeGeocerca = false`.
 */
export function evaluarGeocerca(input: EvaluarGeocercaInput): ResultadoGeocerca {
  if (!input.geocercaActiva || !input.sucursal) {
    return { distanciaM: 0, dentroGeocerca: null, fueraDeGeocerca: false };
  }

  if (!input.empleado) {
    return { distanciaM: 0, dentroGeocerca: null, fueraDeGeocerca: false };
  }

  const distancia = haversineMetros(input.empleado, input.sucursal);
  const dentro = distancia <= Math.max(0, input.radioMetros);
  return {
    distanciaM: distancia,
    dentroGeocerca: dentro,
    fueraDeGeocerca: !dentro,
  };
}

/**
 * Heurística de mock-location: precisión sub-5m con velocidad 0 suele ser
 * un dispositivo que reporta coordenadas simuladas (mock provider).
 */
export function esSospechaMockLocation(
  precisionMetros: number | null | undefined,
  speed: number | null | undefined,
): boolean {
  if (precisionMetros == null) return false;
  if (!Number.isFinite(precisionMetros)) return false;
  return precisionMetros > 0 && precisionMetros < 5 && (speed ?? 0) === 0;
}
