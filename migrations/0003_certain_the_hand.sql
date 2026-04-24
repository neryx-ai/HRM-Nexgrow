CREATE TABLE "dispositivo_quiosco" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"sucursal_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"activado_por" text NOT NULL,
	"expira_en" timestamp,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registro_asistencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empleado_id" uuid NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"fuente" varchar(20) NOT NULL,
	"dispositivo_id" uuid,
	"registrado_por" text,
	"nota" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumen_asistencia_diaria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empleado_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"horas_ordinarias" numeric(5, 2) DEFAULT '0' NOT NULL,
	"horas_extra" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ausente" boolean DEFAULT false NOT NULL,
	"tiene_entrada" boolean DEFAULT false NOT NULL,
	"tiene_salida" boolean DEFAULT false NOT NULL,
	"hora_entrada" timestamp,
	"hora_salida" timestamp,
	"retraso" boolean DEFAULT false NOT NULL,
	"minutos_retraso" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispositivo_quiosco" ADD CONSTRAINT "dispositivo_quiosco_sucursal_id_sucursal_id_fk" FOREIGN KEY ("sucursal_id") REFERENCES "public"."sucursal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivo_quiosco" ADD CONSTRAINT "dispositivo_quiosco_activado_por_user_id_fk" FOREIGN KEY ("activado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_asistencia" ADD CONSTRAINT "registro_asistencia_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_asistencia" ADD CONSTRAINT "registro_asistencia_dispositivo_id_dispositivo_quiosco_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo_quiosco"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_asistencia" ADD CONSTRAINT "registro_asistencia_registrado_por_user_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumen_asistencia_diaria" ADD CONSTRAINT "resumen_asistencia_diaria_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dispositivo_quiosco_token_hash_idx" ON "dispositivo_quiosco" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "dispositivo_quiosco_sucursal_id_idx" ON "dispositivo_quiosco" USING btree ("sucursal_id");--> statement-breakpoint
CREATE INDEX "registro_asistencia_empleado_id_idx" ON "registro_asistencia" USING btree ("empleado_id");--> statement-breakpoint
CREATE INDEX "registro_asistencia_dispositivo_id_idx" ON "registro_asistencia" USING btree ("dispositivo_id");--> statement-breakpoint
CREATE INDEX "registro_asistencia_timestamp_idx" ON "registro_asistencia" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "registro_asistencia_tipo_idx" ON "registro_asistencia" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "resumen_asistencia_empleado_fecha_idx" ON "resumen_asistencia_diaria" USING btree ("empleado_id","fecha");--> statement-breakpoint
CREATE INDEX "resumen_asistencia_fecha_idx" ON "resumen_asistencia_diaria" USING btree ("fecha");