CREATE TABLE "sucursal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"direccion" text,
	"telefono" varchar(20),
	"estado" varchar(20) DEFAULT 'activa' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puesto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"salario_base" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empleado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"sucursal_id" uuid NOT NULL,
	"puesto_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"cedula" varchar(20) NOT NULL,
	"telefono" varchar(20),
	"fecha_nacimiento" date,
	"direccion" text,
	"fecha_ingreso" date NOT NULL,
	"salario_base" numeric(12, 2) NOT NULL,
	"tipo_jornada" varchar(20) DEFAULT 'completa' NOT NULL,
	"horas_jornada" integer DEFAULT 8 NOT NULL,
	"hora_entrada" time DEFAULT '08:00:00' NOT NULL,
	"hora_salida" time DEFAULT '17:00:00' NOT NULL,
	"pin" varchar(6),
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documento_empleado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empleado_id" uuid NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"url" text NOT NULL,
	"subido_por" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "empleado" ADD CONSTRAINT "empleado_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "empleado" ADD CONSTRAINT "empleado_sucursal_id_sucursal_id_fk" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "empleado" ADD CONSTRAINT "empleado_puesto_id_puesto_id_fk" FOREIGN KEY ("puesto_id") REFERENCES "public"."puesto"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documento_empleado" ADD CONSTRAINT "documento_empleado_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "empleado_user_id_idx" ON "empleado" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "empleado_cedula_idx" ON "empleado" USING btree ("cedula");
--> statement-breakpoint
CREATE UNIQUE INDEX "empleado_pin_idx" ON "empleado" USING btree ("pin");
--> statement-breakpoint
CREATE INDEX "empleado_sucursal_id_idx" ON "empleado" USING btree ("sucursal_id");
--> statement-breakpoint
CREATE INDEX "empleado_puesto_id_idx" ON "empleado" USING btree ("puesto_id");
--> statement-breakpoint
CREATE INDEX "empleado_estado_idx" ON "empleado" USING btree ("estado");
--> statement-breakpoint
CREATE INDEX "documento_empleado_empleado_id_idx" ON "documento_empleado" USING btree ("empleado_id");
