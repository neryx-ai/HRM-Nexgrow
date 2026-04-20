import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";

export const sucursal = pgTable("sucursal", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  direccion: text("direccion"),
  telefono: varchar("telefono", { length: 20 }),
  estado: varchar("estado", { length: 20 }).notNull().default("activa"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sucursalRelations = relations(sucursal, ({ many }) => ({
  empleados: many(empleado),
}));
