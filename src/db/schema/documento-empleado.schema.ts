import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";

export const documentoEmpleado = pgTable(
  "documento_empleado",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    nombre: varchar("nombre", { length: 150 }).notNull(),
    tipo: varchar("tipo", { length: 50 }).notNull(),
    url: text("url").notNull(),
    subidoPor: text("subido_por").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("documento_empleado_empleado_id_idx").on(table.empleadoId)],
);

export const documentoEmpleadoRelations = relations(
  documentoEmpleado,
  ({ one }) => ({
    empleado: one(empleado, {
      fields: [documentoEmpleado.empleadoId],
      references: [empleado.id],
    }),
  }),
);
