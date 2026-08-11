-- Migración: página personal de asistencia, geocercas, notificaciones geo y solicitudes de personal

-- 1. Nuevas columnas en sucursal (geocerca)
ALTER TABLE "sucursal"
  ADD COLUMN IF NOT EXISTS "latitud" double precision,
  ADD COLUMN IF NOT EXISTS "longitud" double precision,
  ADD COLUMN IF NOT EXISTS "radio_metros" integer NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS "geocerca_activa" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tipo_geocerca" varchar(20) NOT NULL DEFAULT 'circular';

-- 2. Nuevas columnas en registro_asistencia
ALTER TABLE "registro_asistencia"
  ADD COLUMN IF NOT EXISTS "lat_empleado" double precision,
  ADD COLUMN IF NOT EXISTS "lng_empleado" double precision,
  ADD COLUMN IF NOT EXISTS "precision_metros" double precision,
  ADD COLUMN IF NOT EXISTS "fuente_coordenada" varchar(20) NOT NULL DEFAULT 'no-enviada',
  ADD COLUMN IF NOT EXISTS "distancia_sucursal_m" integer,
  ADD COLUMN IF NOT EXISTS "dentro_geocerca" boolean,
  ADD COLUMN IF NOT EXISTS "fuera_de_geocerca" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sucursal_id" uuid REFERENCES "sucursal"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "ip_origen" text,
  ADD COLUMN IF NOT EXISTS "user_agent" text;

CREATE INDEX IF NOT EXISTS "registro_asistencia_fuera_geocerca_idx" ON "registro_asistencia" ("fuera_de_geocerca");

-- 3. Nuevas columnas en empleado
ALTER TABLE "empleado"
  ADD COLUMN IF NOT EXISTS "geolocalizacion_habilitada" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consentimiento_geolocalizacion_at" timestamp;

-- 4. Nueva tabla notificacion_geo
CREATE TABLE IF NOT EXISTS "notificacion_geo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "empleado_id" uuid NOT NULL REFERENCES "empleado"("id") ON DELETE CASCADE,
  "registro_id" uuid NOT NULL REFERENCES "registro_asistencia"("id") ON DELETE CASCADE,
  "sucursal_id" uuid NOT NULL REFERENCES "sucursal"("id") ON DELETE CASCADE,
  "distancia_m" integer NOT NULL,
  "resuelta" boolean NOT NULL DEFAULT false,
  "resuelta_por" text REFERENCES "user"("id"),
  "resuelta_en" timestamp,
  "accion" varchar(20),
  "nota" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "notificacion_geo_resuelta_idx" ON "notificacion_geo" ("resuelta");
CREATE INDEX IF NOT EXISTS "notificacion_geo_empleado_idx" ON "notificacion_geo" ("empleado_id");
CREATE INDEX IF NOT EXISTS "notificacion_geo_sucursal_idx" ON "notificacion_geo" ("sucursal_id");

-- 5. Nueva tabla solicitud_personal
CREATE TABLE IF NOT EXISTS "solicitud_personal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "empleado_id" uuid NOT NULL REFERENCES "empleado"("id") ON DELETE CASCADE,
  "tipo" varchar(20) NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "dias_habiles" integer NOT NULL DEFAULT 0,
  "motivo" text,
  "adjunto_url" text,
  "estado" varchar(20) NOT NULL DEFAULT 'pendiente',
  "aprobada_por" text REFERENCES "user"("id"),
  "aprobada_en" timestamp,
  "nota_resolucion" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "solicitud_personal_empleado_idx" ON "solicitud_personal" ("empleado_id");
CREATE INDEX IF NOT EXISTS "solicitud_personal_estado_idx" ON "solicitud_personal" ("estado");
CREATE INDEX IF NOT EXISTS "solicitud_personal_tipo_idx" ON "solicitud_personal" ("tipo");
