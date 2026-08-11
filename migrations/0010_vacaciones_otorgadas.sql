-- Migración: Rediseño del módulo de vacaciones
-- Crea la tabla movimiento_saldo_vacacion (fuente de verdad del histórico de saldos)
-- y agrega columnas de auditoría a saldo_vacaciones (que pasa a ser caché).
--
-- Esta migración es idempotente: puede ejecutarse varias veces sin romper el estado.
-- La migración de datos desde solicitud_vacacion y el DROP de esa tabla se hacen
-- en una migración posterior (0011) tras validación manual con el equipo.

-- 1. Crear tabla movimiento_saldo_vacacion
CREATE TABLE IF NOT EXISTS "movimiento_saldo_vacacion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL REFERENCES "empleado"("id") ON DELETE CASCADE,
  "tipo" varchar(30) NOT NULL,
  "dias" integer NOT NULL,
  "motivo" text NOT NULL,
  "realizado_por" text NOT NULL REFERENCES "user"("id"),
  "fecha" timestamp DEFAULT now() NOT NULL,
  "solicitud_personal_id" uuid REFERENCES "solicitud_personal"("id") ON DELETE SET NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "movimiento_saldo_vacacion_empleado_idx"
  ON "movimiento_saldo_vacacion" ("empleado_id");
CREATE INDEX IF NOT EXISTS "movimiento_saldo_vacacion_tipo_idx"
  ON "movimiento_saldo_vacacion" ("tipo");
CREATE INDEX IF NOT EXISTS "movimiento_saldo_vacacion_fecha_idx"
  ON "movimiento_saldo_vacacion" ("fecha");

-- 2. Redefinir saldo_vacaciones como caché: agregar columnas de auditoría
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saldo_vacaciones' AND column_name = 'ultima_actualizacion'
  ) THEN
    ALTER TABLE "saldo_vacaciones"
      ADD COLUMN "ultima_actualizacion" timestamp DEFAULT now() NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saldo_vacaciones' AND column_name = 'actualizado_por'
  ) THEN
    ALTER TABLE "saldo_vacaciones"
      ADD COLUMN "actualizado_por" text REFERENCES "user"("id");
  END IF;
END $$;
