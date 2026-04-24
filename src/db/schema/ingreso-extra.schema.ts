import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { detallePlanilla } from "./detalle-planilla.schema";
import { empleado } from "./empleado.schema";

export const ingresoExtra = pgTable(
  "ingreso_extra",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    detallePlanillaId: uuid("detalle_planilla_id")
      .notNull()
      .references(() => detallePlanilla.id, { onDelete: "cascade" }),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    concepto: varchar("concepto", { length: 200 }).notNull(),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
    tipo: varchar("tipo", { length: 30 }).notNull().default("otro"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("ingreso_extra_detalle_idx").on(table.detallePlanillaId),
    index("ingreso_extra_empleado_idx").on(table.empleadoId),
  ],
);

export const ingresoExtraRelations = relations(ingresoExtra, ({ one }) => ({
  detallePlanilla: one(detallePlanilla, {
    fields: [ingresoExtra.detallePlanillaId],
    references: [detallePlanilla.id],
  }),
  empleado: one(empleado, {
    fields: [ingresoExtra.empleadoId],
    references: [empleado.id],
  }),
}));
