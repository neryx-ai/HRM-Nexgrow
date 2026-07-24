"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoGeolocalizacion =
  | "idle"
  | "solicitando"
  | "concedido"
  | "denegado"
  | "no-disponible"
  | "timeout"
  | "error";

export interface CoordenadaCapturada {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: number;
}

interface UseGeolocationOptions {
  timeoutMs?: number;
  enableHighAccuracy?: boolean;
  autoStart?: boolean;
}

interface UseGeolocationResult {
  estado: EstadoGeolocalizacion;
  coords: CoordenadaCapturada | null;
  mensaje: string | null;
  solicitar: () => void;
  reset: () => void;
}

const DEFAULT_TIMEOUT_MS = 8_000;

export function useGeolocation(
  options: UseGeolocationOptions = {},
): UseGeolocationResult {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    enableHighAccuracy = true,
  } = options;

  const [estado, setEstado] = useState<EstadoGeolocalizacion>("idle");
  const [coords, setCoords] = useState<CoordenadaCapturada | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cancelRef = useRef<(() => void) | null>(null);

  const limpiar = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
  }, []);

  const solicitar = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setEstado("no-disponible");
      setMensaje("Tu navegador no soporta geolocalización.");
      return;
    }

    limpiar();
    setEstado("solicitando");
    setMensaje("Solicitando tu ubicación…");

    let didFinish = false;
    const timeoutId = window.setTimeout(() => {
      if (didFinish) return;
      didFinish = true;
      setEstado("timeout");
      setMensaje(
        "La solicitud de ubicación tardó demasiado. Podés continuar sin ella.",
      );
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (didFinish) return;
        didFinish = true;
        window.clearTimeout(timeoutId);
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: position.timestamp || Date.now(),
        });
        setEstado("concedido");
        setMensaje(null);
      },
      (error) => {
        if (didFinish) return;
        didFinish = true;
        window.clearTimeout(timeoutId);
        if (error.code === error.PERMISSION_DENIED) {
          setEstado("denegado");
          setMensaje(
            "Denegaste el permiso de ubicación. Podés continuar sin ella.",
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setEstado("no-disponible");
          setMensaje(
            "No se pudo obtener tu ubicación. Intentá más tarde o continuá sin ella.",
          );
        } else {
          setEstado("error");
          setMensaje("Error al obtener la ubicación.");
        }
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: 0,
      },
    );

    cancelRef.current = () => {
      if (didFinish) return;
      didFinish = true;
      window.clearTimeout(timeoutId);
    };
  }, [enableHighAccuracy, limpiar, timeoutMs]);

  const reset = useCallback(() => {
    limpiar();
    setEstado("idle");
    setCoords(null);
    setMensaje(null);
  }, [limpiar]);

  useEffect(() => {
    return limpiar;
  }, [limpiar]);

  return { estado, coords, mensaje, solicitar, reset };
}
