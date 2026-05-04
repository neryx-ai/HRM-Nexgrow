CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tabla" varchar(60) NOT NULL,
	"registro_id" text NOT NULL,
	"accion" varchar(20) NOT NULL,
	"antes" jsonb,
	"despues" jsonb,
	"realizado_por" text NOT NULL,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracion_deduccion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"valor" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "configuracion_deduccion_clave_unique" UNIQUE("clave")
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_realizado_por_user_id_fk" FOREIGN KEY ("realizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;