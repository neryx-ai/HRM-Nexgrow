import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";

export const puesto = pgTable("puesto", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  salarioBase: numeric("salario_base", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const puestoRelations = relations(puesto, ({ many }) => ({
  empleados: many(empleado),
}));
