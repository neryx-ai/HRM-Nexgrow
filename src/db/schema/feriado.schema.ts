import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const feriado = pgTable(
  "feriado",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fecha: date("fecha").notNull(),
    nombre: varchar("nombre", { length: 150 }).notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("nacional"),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("feriado_fecha_idx").on(table.fecha)],
);

export const feriadoRelations = relations(feriado, ({}) => ({}));
