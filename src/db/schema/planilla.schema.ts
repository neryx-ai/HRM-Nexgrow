import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  numeric,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";
import { detallePlanilla } from "./detalle-planilla.schema";

export const planilla = pgTable(
  "planilla",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("mensual"),
    estado: varchar("estado", { length: 20 }).notNull().default("borrador"),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    fechaPago: date("fecha_pago"),
    totalEmpleados: integer("total_empleados").notNull().default(0),
    totalSalariosBrutos: numeric("total_salarios_brutos", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalHorasExtra: numeric("total_horas_extra", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalBonos: numeric("total_bonos", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    totalComisiones: numeric("total_comisiones", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    totalDeduccionesLegales: numeric("total_deducciones_legales", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalDeduccionesAdicionales: numeric("total_deducciones_adicionales", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalSalariosNeto: numeric("total_salarios_neto", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    creadoPor: text("creado_por")
      .notNull()
      .references(() => user.id),
    confirmadoPor: text("confirmado_por").references(() => user.id),
    confirmadoEn: timestamp("confirmado_en"),
    nota: text("nota"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("planilla_estado_idx").on(table.estado),
    index("planilla_tipo_idx").on(table.tipo),
    index("planilla_fecha_inicio_idx").on(table.fechaInicio),
    index("planilla_fecha_fin_idx").on(table.fechaFin),
  ],
);

export const planillaRelations = relations(planilla, ({ one, many }) => ({
  creadoPorUser: one(user, {
    fields: [planilla.creadoPor],
    references: [user.id],
  }),
  confirmadoPorUser: one(user, {
    fields: [planilla.confirmadoPor],
    references: [user.id],
  }),
  detalles: many(detallePlanilla),
}));
