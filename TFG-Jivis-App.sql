CREATE TABLE "sucursales" (
  "id" SERIAL PRIMARY KEY,
  "nombre" varchar(100) NOT NULL,
  "direccion" varchar(255) NOT NULL,
  "codigo" varchar(20) UNIQUE,
  "gerente_id" integer,
  "activa" boolean DEFAULT true,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "usuarios" (
  "id" SERIAL PRIMARY KEY,
  "email" varchar(150) UNIQUE NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "rol" rol_enum NOT NULL,
  "empleado_id" integer,
  "activo" boolean DEFAULT true,
  "reset_token" varchar(255),
  "reset_expires" timestamp,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "empleados" (
  "id" SERIAL PRIMARY KEY,
  "cedula" varchar(20) UNIQUE NOT NULL,
  "nombre_completo" varchar(150) NOT NULL,
  "email" varchar(150) NOT NULL,
  "telefono" varchar(20),
  "puesto" varchar(100) NOT NULL,
  "salario_base" decimal(12,2) NOT NULL,
  "tipo_contrato" varchar(50),
  "fecha_ingreso" date NOT NULL,
  "sucursal_id" integer NOT NULL,
  "pin_asistencia" varchar(10) UNIQUE NOT NULL,
  "estado" varchar(20) DEFAULT 'activo',
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "documentos_empleado" (
  "id" SERIAL PRIMARY KEY,
  "empleado_id" integer NOT NULL,
  "tipo" varchar(100) NOT NULL,
  "nombre" varchar(255) NOT NULL,
  "url" varchar(500) NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "registros_asistencia" (
  "id" SERIAL PRIMARY KEY,
  "empleado_id" integer NOT NULL,
  "fecha" date NOT NULL,
  "hora_entrada" time,
  "hora_salida" time,
  "horas_ordinarias" decimal(5,2) DEFAULT 0,
  "horas_extra" decimal(5,2) DEFAULT 0,
  "es_feriado" boolean DEFAULT false,
  "estado" varchar(30),
  "observaciones" text,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "ausencias" (
  "id" SERIAL PRIMARY KEY,
  "empleado_id" integer NOT NULL,
  "tipo" varchar(50) NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "dias_totales" integer NOT NULL,
  "estado" varchar(30) DEFAULT 'pendiente',
  "aprobado_por" integer,
  "observaciones" text,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "planillas" (
  "id" SERIAL PRIMARY KEY,
  "periodo_inicio" date NOT NULL,
  "periodo_fin" date NOT NULL,
  "tipo_periodo" varchar(20),
  "sucursal_id" integer,
  "estado" varchar(20) DEFAULT 'borrador',
  "generado_por" integer NOT NULL,
  "total_bruto" decimal(14,2) DEFAULT 0,
  "total_deducciones" decimal(14,2) DEFAULT 0,
  "total_neto" decimal(14,2) DEFAULT 0,
  "created_at" timestamp DEFAULT (now()),
  "updated_at" timestamp DEFAULT (now())
);

CREATE TABLE "planilla_detalle" (
  "id" SERIAL PRIMARY KEY,
  "planilla_id" integer NOT NULL,
  "empleado_id" integer NOT NULL,
  "salario_base" decimal(12,2) NOT NULL,
  "horas_ordinarias" decimal(5,2) DEFAULT 0,
  "horas_extra" decimal(5,2) DEFAULT 0,
  "dias_ausencia" integer DEFAULT 0,
  "dias_vacacion" integer DEFAULT 0,
  "monto_horas_extra" decimal(12,2) DEFAULT 0,
  "deduccion_ccss" decimal(12,2) DEFAULT 0,
  "deduccion_banco_popular" decimal(12,2) DEFAULT 0,
  "deduccion_ins" decimal(12,2) DEFAULT 0,
  "deduccion_renta" decimal(12,2) DEFAULT 0,
  "total_deducciones" decimal(12,2) DEFAULT 0,
  "total_bonos" decimal(12,2) DEFAULT 0,
  "salario_neto" decimal(12,2) NOT NULL,
  "colilla_enviada" boolean DEFAULT false,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "deducciones_adicionales" (
  "id" SERIAL PRIMARY KEY,
  "planilla_det_id" integer NOT NULL,
  "tipo" varchar(30) NOT NULL,
  "descripcion" varchar(255) NOT NULL,
  "monto" decimal(12,2) NOT NULL,
  "created_at" timestamp DEFAULT (now())
);

COMMENT ON COLUMN "sucursales"."gerente_id" IS 'FK opcional, se asigna después';

COMMENT ON COLUMN "usuarios"."rol" IS 'Admin | Gerencia | RRHH | Contabilidad | Empleado';

COMMENT ON COLUMN "empleados"."tipo_contrato" IS 'tiempo_completo | medio_tiempo | temporal';

COMMENT ON COLUMN "empleados"."pin_asistencia" IS 'Generado automáticamente';

COMMENT ON COLUMN "empleados"."estado" IS 'activo | inactivo | suspendido';

COMMENT ON COLUMN "documentos_empleado"."tipo" IS 'contrato | identificacion | otro';

COMMENT ON COLUMN "registros_asistencia"."estado" IS 'normal | retraso | salida_temprana | ausente';

COMMENT ON COLUMN "ausencias"."tipo" IS 'vacacion | incapacidad | permiso | ausencia';

COMMENT ON COLUMN "ausencias"."estado" IS 'pendiente | aprobada | rechazada';

COMMENT ON COLUMN "planillas"."tipo_periodo" IS 'quincenal | semanal | mensual';

COMMENT ON COLUMN "planillas"."sucursal_id" IS 'null = todas las sucursales';

COMMENT ON COLUMN "planillas"."estado" IS 'borrador | procesada | enviada';

COMMENT ON COLUMN "deducciones_adicionales"."tipo" IS 'deduccion | bono | comision | penalizacion';

ALTER TABLE "sucursales" ADD FOREIGN KEY ("gerente_id") REFERENCES "empleados" ("id");

ALTER TABLE "usuarios" ADD FOREIGN KEY ("empleado_id") REFERENCES "empleados" ("id");

ALTER TABLE "empleados" ADD FOREIGN KEY ("sucursal_id") REFERENCES "sucursales" ("id");

ALTER TABLE "documentos_empleado" ADD FOREIGN KEY ("empleado_id") REFERENCES "empleados" ("id");

ALTER TABLE "registros_asistencia" ADD FOREIGN KEY ("empleado_id") REFERENCES "empleados" ("id");

ALTER TABLE "ausencias" ADD FOREIGN KEY ("empleado_id") REFERENCES "empleados" ("id");

ALTER TABLE "ausencias" ADD FOREIGN KEY ("aprobado_por") REFERENCES "usuarios" ("id");

ALTER TABLE "planillas" ADD FOREIGN KEY ("sucursal_id") REFERENCES "sucursales" ("id");

ALTER TABLE "planillas" ADD FOREIGN KEY ("generado_por") REFERENCES "usuarios" ("id");

ALTER TABLE "planilla_detalle" ADD FOREIGN KEY ("planilla_id") REFERENCES "planillas" ("id");

ALTER TABLE "planilla_detalle" ADD FOREIGN KEY ("empleado_id") REFERENCES "empleados" ("id");

ALTER TABLE "deducciones_adicionales" ADD FOREIGN KEY ("planilla_det_id") REFERENCES "planilla_detalle" ("id");

ALTER TABLE "usuarios" ADD FOREIGN KEY ("reset_expires") REFERENCES "usuarios" ("empleado_id");
