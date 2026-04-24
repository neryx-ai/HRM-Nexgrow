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

export const deduccionAdicional = pgTable(
  "deduccion_adicional",
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
    index("deduccion_adicional_detalle_idx").on(table.detallePlanillaId),
    index("deduccion_adicional_empleado_idx").on(table.empleadoId),
  ],
);

export const deduccionAdicionalRelations = relations(
  deduccionAdicional,
  ({ one }) => ({
    detallePlanilla: one(detallePlanilla, {
      fields: [deduccionAdicional.detallePlanillaId],
      references: [detallePlanilla.id],
    }),
    empleado: one(empleado, {
      fields: [deduccionAdicional.empleadoId],
      references: [empleado.id],
    }),
  }),
);
