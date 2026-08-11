-- Migración: configuración general (clave-valor)
-- Tabla flexible para flags globales de la empresa (ej. sábado hábil).

CREATE TABLE IF NOT EXISTS "configuracion_general" (
  "clave" text PRIMARY KEY,
  "valor" text NOT NULL,
  "descripcion" text,
  "actualizado_por" text REFERENCES "user"("id"),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "configuracion_general_clave_idx"
  ON "configuracion_general" ("clave");

-- Default: sábado NO hábil (L-V jornada estándar)
INSERT INTO "configuracion_general" ("clave", "valor", "descripcion")
VALUES (
  'sabado_habil',
  'false',
  'Si está activo, el sábado se considera día hábil para el cálculo de días de vacaciones y días libres.'
)
ON CONFLICT ("clave") DO NOTHING;
