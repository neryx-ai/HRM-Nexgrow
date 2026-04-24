CREATE TABLE "tramo_renta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"limite_inferior" numeric(12, 2) DEFAULT '0' NOT NULL,
	"limite_superior" numeric(12, 2),
	"porcentaje" numeric(5, 2) NOT NULL,
	"monto_excedente" numeric(12, 2) NOT NULL,
	"descripcion" varchar(200),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planilla" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(20) DEFAULT 'mensual' NOT NULL,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"fecha_pago" date,
	"total_empleados" integer DEFAULT 0 NOT NULL,
	"total_salarios_brutos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_horas_extra" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_bonos" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_comisiones" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deducciones_legales" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deducciones_adicionales" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_salarios_neto" numeric(14, 2) DEFAULT '0' NOT NULL,
	"creado_por" text NOT NULL,
	"confirmado_por" text,
	"confirmado_en" timestamp,
	"nota" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detalle_planilla" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planilla_id" uuid NOT NULL,
	"empleado_id" uuid NOT NULL,
	"salario_bruto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"horas_ordinarias" numeric(5, 2) DEFAULT '0' NOT NULL,
	"horas_extra" numeric(5, 2) DEFAULT '0' NOT NULL,
	"monto_horas_extra" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ccss_empleado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ins_empleado" numeric(12, 2) DEFAULT '0' NOT NULL,
	"impuesto_renta" numeric(12, 2) DEFAULT '0' NOT NULL,
	"banco_popular" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deducciones_legales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deducciones_adicionales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_ingresos_extras" numeric(12, 2) DEFAULT '0' NOT NULL,
	"salario_neto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"colilla_enviada" numeric(1, 0) DEFAULT '0' NOT NULL,
	"nota" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deduccion_adicional" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detalle_planilla_id" uuid NOT NULL,
	"empleado_id" uuid NOT NULL,
	"concepto" varchar(200) NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"tipo" varchar(30) DEFAULT 'otro' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingreso_extra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detalle_planilla_id" uuid NOT NULL,
	"empleado_id" uuid NOT NULL,
	"concepto" varchar(200) NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"tipo" varchar(30) DEFAULT 'otro' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planilla" ADD CONSTRAINT "planilla_creado_por_user_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planilla" ADD CONSTRAINT "planilla_confirmado_por_user_id_fk" FOREIGN KEY ("confirmado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_planilla" ADD CONSTRAINT "detalle_planilla_planilla_id_planilla_id_fk" FOREIGN KEY ("planilla_id") REFERENCES "public"."planilla"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_planilla" ADD CONSTRAINT "detalle_planilla_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deduccion_adicional" ADD CONSTRAINT "deduccion_adicional_detalle_planilla_id_detalle_planilla_id_fk" FOREIGN KEY ("detalle_planilla_id") REFERENCES "public"."detalle_planilla"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deduccion_adicional" ADD CONSTRAINT "deduccion_adicional_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingreso_extra" ADD CONSTRAINT "ingreso_extra_detalle_planilla_id_detalle_planilla_id_fk" FOREIGN KEY ("detalle_planilla_id") REFERENCES "public"."detalle_planilla"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingreso_extra" ADD CONSTRAINT "ingreso_extra_empleado_id_empleado_id_fk" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleado"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tramo_renta_activo_idx" ON "tramo_renta" USING btree ("activo");--> statement-breakpoint
CREATE INDEX "planilla_estado_idx" ON "planilla" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "planilla_tipo_idx" ON "planilla" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "planilla_fecha_inicio_idx" ON "planilla" USING btree ("fecha_inicio");--> statement-breakpoint
CREATE INDEX "planilla_fecha_fin_idx" ON "planilla" USING btree ("fecha_fin");--> statement-breakpoint
CREATE INDEX "detalle_planilla_planilla_id_idx" ON "detalle_planilla" USING btree ("planilla_id");--> statement-breakpoint
CREATE INDEX "detalle_planilla_empleado_id_idx" ON "detalle_planilla" USING btree ("empleado_id");--> statement-breakpoint
CREATE INDEX "deduccion_adicional_detalle_idx" ON "deduccion_adicional" USING btree ("detalle_planilla_id");--> statement-breakpoint
CREATE INDEX "deduccion_adicional_empleado_idx" ON "deduccion_adicional" USING btree ("empleado_id");--> statement-breakpoint
CREATE INDEX "ingreso_extra_detalle_idx" ON "ingreso_extra" USING btree ("detalle_planilla_id");--> statement-breakpoint
CREATE INDEX "ingreso_extra_empleado_idx" ON "ingreso_extra" USING btree ("empleado_id");