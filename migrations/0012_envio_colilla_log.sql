-- Migración: tabla envio_colilla_log
-- Almacena el historial de cada intento de envío de colilla de pago
-- (inicial o reenvío manual), con el resultado, email destino y mensaje
-- de error si falló. Permite auditar y depurar fallos de SMTP.

CREATE TABLE IF NOT EXISTS "envio_colilla_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "planilla_id" uuid NOT NULL REFERENCES "planilla"("id") ON DELETE CASCADE,
  "detalle_planilla_id" uuid NOT NULL REFERENCES "detalle_planilla"("id") ON DELETE CASCADE,
  "empleado_id" uuid NOT NULL REFERENCES "empleado"("id") ON DELETE CASCADE,
  "email_destino" text NOT NULL,
  "exito" boolean NOT NULL,
  "mensaje_error" text,
  "mensaje_id" text,
  "tipo_envio" varchar(20) NOT NULL DEFAULT 'inicial',
  "realizado_por" text NOT NULL REFERENCES "user"("id"),
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "envio_colilla_log_planilla_id_idx"
  ON "envio_colilla_log" ("planilla_id");
CREATE INDEX IF NOT EXISTS "envio_colilla_log_detalle_planilla_id_idx"
  ON "envio_colilla_log" ("detalle_planilla_id");
CREATE INDEX IF NOT EXISTS "envio_colilla_log_empleado_id_idx"
  ON "envio_colilla_log" ("empleado_id");
CREATE INDEX IF NOT EXISTS "envio_colilla_log_exito_idx"
  ON "envio_colilla_log" ("exito");