CREATE TABLE "feriado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" date NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"tipo" varchar(20) DEFAULT 'nacional' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saldo_vacaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empleado_id" uuid NOT NULL,
	"periodo_inicio" date NOT NULL,
	"periodo_fin" date NOT NULL,
	"dias_otorgados" integer DEFAULT 0 NOT NULL,
	"dias_disponibles" integer DEFAULT 0 NOT NULL,
	"dias_usados" integer DEFAULT 0 NOT NULL,
	"dias_pendientes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitud_vacacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empleado_id" uuid NOT NULL,
	"saldo_vacacion_id" uuid NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"dias_habiles" integer NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"motivo_rechazo" text,
	"aprobado_por" text,
	"aprobado_en" timestamp,
	"nota" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saldo_vacaciones" ADD CONSTRAINT "saldo_vacaciones_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_vacacion" ADD CONSTRAINT "solicitud_vacacion_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_vacacion" ADD CONSTRAINT "solicitud_vacacion_saldo_vacacion_id_saldo_vacaciones_id_fk" FOREIGN KEY ("saldo_vacacion_id") REFERENCES "public"."saldo_vacaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_vacacion" ADD CONSTRAINT "solicitud_vacacion_aprobado_por_user_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feriado_fecha_idx" ON "feriado" USING btree ("fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "saldo_vacaciones_empleado_periodo_idx" ON "saldo_vacaciones" USING btree ("empleado_id","periodo_inicio");--> statement-breakpoint
CREATE INDEX "saldo_vacaciones_empleado_id_idx" ON "saldo_vacaciones" USING btree ("empleado_id");--> statement-breakpoint
CREATE INDEX "solicitud_vacacion_empleado_id_idx" ON "solicitud_vacacion" USING btree ("empleado_id");--> statement-breakpoint
CREATE INDEX "solicitud_vacacion_saldo_id_idx" ON "solicitud_vacacion" USING btree ("saldo_vacacion_id");--> statement-breakpoint
CREATE INDEX "solicitud_vacacion_estado_idx" ON "solicitud_vacacion" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "solicitud_vacacion_fecha_inicio_idx" ON "solicitud_vacacion" USING btree ("fecha_inicio");