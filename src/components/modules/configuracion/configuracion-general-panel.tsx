"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Loader2 } from "lucide-react";
import { updateConfiguracionGeneral } from "@/actions/configuracion-general.actions";

interface ConfigItem {
  clave: string;
  valor: string;
  descripcion: string | null;
}

interface ConfiguracionGeneralPanelProps {
  configuraciones: ConfigItem[];
}

export function ConfiguracionGeneralPanel({
  configuraciones,
}: ConfiguracionGeneralPanelProps) {
  const initial = (clave: string, defaultValue: string) => {
    const found = configuraciones.find((c) => c.clave === clave);
    return found ? found.valor : defaultValue;
  };

  const [sabadoHabil, setSabadoHabil] = useState(
    initial("sabado_habil", "false") === "true",
  );
  const [saving, setSaving] = useState(false);

  async function handleToggle(next: boolean) {
    setSabadoHabil(next);
    setSaving(true);
    const res = await updateConfiguracionGeneral(
      "sabado_habil",
      next ? "true" : "false",
    );
    setSaving(false);
    if (!res.success) {
      setSabadoHabil(!next);
      toast.error(res.message);
      return;
    }
    toast.success(
      next
        ? "Sábado marcado como día hábil. Aplica a partir de ahora."
        : "Sábado marcado como no hábil. Aplica a partir de ahora.",
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración general</CardTitle>
        <CardDescription>
          Flags globales que afectan el cálculo de vacaciones y días libres.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Field>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <FieldLabel>Sábado hábil</FieldLabel>
              <FieldDescription>
                Si está activo, el sábado se considera día hábil para el cálculo
                de días de vacaciones y días libres. Útil para empresas con
                jornada de lunes a sábado.
              </FieldDescription>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sabadoHabil}
                disabled={saving}
                onChange={(e) => handleToggle(e.target.checked)}
                className="size-5 accent-emerald-600"
              />
              <span className="text-sm font-medium w-12">
                {sabadoHabil ? "Sí" : "No"}
              </span>
            </label>
          </div>
          {saving && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Loader2 className="size-3 animate-spin" /> Guardando...
            </p>
          )}
        </Field>
      </CardContent>
    </Card>
  );
}
