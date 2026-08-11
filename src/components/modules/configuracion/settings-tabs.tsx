"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeduccionesForm, type Deduccion } from "./deducciones-form";
import { FeriadosTable } from "./feriados-table";
import { TramosTable } from "./tramos-table";
import { UsuariosTable } from "./usuarios-table";
import { ConfiguracionGeneralPanel } from "./configuracion-general-panel";

interface Feriado {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
  activo: boolean | null;
}

interface Tramo {
  id: string;
  limiteInferior: string;
  limiteSuperior: string | null;
  porcentaje: string;
  montoExcedente: string;
  descripcion: string | null;
  activo: boolean | null;
}

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean | null;
  banReason: string | null;
  emailVerified: boolean | null;
  createdAt: Date;
}

interface ConfiguracionGeneral {
  clave: string;
  valor: string;
  descripcion: string | null;
}

const TABS = [
  { id: "general", label: "General" },
  { id: "deducciones", label: "Deducciones" },
  { id: "feriados", label: "Feriados" },
  { id: "tramos", label: "Tramos Renta" },
  { id: "usuarios", label: "Usuarios" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsTabs({
  deducciones,
  feriados,
  tramos,
  usuarios,
  configuracionesGenerales,
}: {
  deducciones: Deduccion[];
  feriados: Feriado[];
  tramos: Tramo[];
  usuarios: Usuario[];
  configuracionesGenerales: ConfiguracionGeneral[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <div>
      <div className="flex gap-1 border-b mb-4 pb-1 pt-4" role="tablist" aria-label="Configuración">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div
        id="panel-general"
        role="tabpanel"
        hidden={activeTab !== "general"}
      >
        {activeTab === "general" && (
          <ConfiguracionGeneralPanel configuraciones={configuracionesGenerales} />
        )}
      </div>
      <div
        id="panel-deducciones"
        role="tabpanel"
        hidden={activeTab !== "deducciones"}
      >
        {activeTab === "deducciones" && <DeduccionesForm deducciones={deducciones} />}
      </div>
      <div
        id="panel-feriados"
        role="tabpanel"
        hidden={activeTab !== "feriados"}
      >
        {activeTab === "feriados" && <FeriadosTable feriados={feriados} />}
      </div>
      <div
        id="panel-tramos"
        role="tabpanel"
        hidden={activeTab !== "tramos"}
      >
        {activeTab === "tramos" && <TramosTable tramos={tramos} />}
      </div>
      <div
        id="panel-usuarios"
        role="tabpanel"
        hidden={activeTab !== "usuarios"}
      >
        {activeTab === "usuarios" && <UsuariosTable usuarios={usuarios} />}
      </div>
    </div>
  );
}
