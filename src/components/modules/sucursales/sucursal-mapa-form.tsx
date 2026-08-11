"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, MapPin } from "lucide-react";
import { updateGeocerca } from "@/actions/sucursal.actions";

const SucursalMapa = dynamic(() => import("./sucursal-mapa-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-md border flex items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> Cargando mapa…
    </div>
  ),
});

interface Props {
  sucursalId: string;
  sucursalNombre: string;
  latitudInicial: number | null;
  longitudInicial: number | null;
  radioInicial: number;
  geocercaActivaInicial: boolean;
}

export function SucursalMapaForm({
  sucursalId,
  sucursalNombre,
  latitudInicial,
  longitudInicial,
  radioInicial,
  geocercaActivaInicial,
}: Props) {
  const [latitud, setLatitud] = useState<number | null>(latitudInicial);
  const [longitud, setLongitud] = useState<number | null>(longitudInicial);
  const [radio, setRadio] = useState<number>(radioInicial);
  const [geocercaActiva, setGeocercaActiva] = useState<boolean>(geocercaActivaInicial);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setLatitud(latitudInicial);
    setLongitud(longitudInicial);
    setRadio(radioInicial);
    setGeocercaActiva(geocercaActivaInicial);
  }, [latitudInicial, longitudInicial, radioInicial, geocercaActivaInicial, sucursalId]);

  const guardar = async () => {
    setIsPending(true);
    try {
      const res = await updateGeocerca({
        sucursalId,
        latitud: latitud,
        longitud: longitud,
        radioMetros: radio,
        geocercaActiva,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Geocerca actualizada");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4" /> Geocerca — {sucursalNombre}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SucursalMapa
          latitud={latitud}
          longitud={longitud}
          radio={radio}
          geocercaActiva={geocercaActiva}
          onChange={(lat, lng) => {
            setLatitud(lat);
            setLongitud(lng);
          }}
        />

        <FieldGroup className="grid md:grid-cols-3 gap-3">
          <Field>
            <FieldLabel>Latitud</FieldLabel>
            <Input
              type="number"
              step="any"
              value={latitud ?? ""}
              onChange={(e) =>
                setLatitud(e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </Field>
          <Field>
            <FieldLabel>Longitud</FieldLabel>
            <Input
              type="number"
              step="any"
              value={longitud ?? ""}
              onChange={(e) =>
                setLongitud(e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </Field>
          <Field>
            <FieldLabel>Radio (m)</FieldLabel>
            <Input
              type="number"
              min={10}
              max={5000}
              value={radio}
              onChange={(e) => setRadio(Math.max(10, Number(e.target.value) || 0))}
            />
          </Field>
        </FieldGroup>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={geocercaActiva}
            onChange={(e) => setGeocercaActiva(e.target.checked)}
          />
          Activar validación de geocerca
        </label>

        <Button onClick={guardar} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Guardar geocerca
        </Button>
      </CardContent>
    </Card>
  );
}
