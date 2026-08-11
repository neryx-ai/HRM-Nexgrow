import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  doublePrecision,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";

export const sucursal = pgTable(
  "sucursal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    direccion: text("direccion"),
    telefono: varchar("telefono", { length: 20 }),
    estado: varchar("estado", { length: 20 }).notNull().default("activa"),
    latitud: doublePrecision("latitud"),
    longitud: doublePrecision("longitud"),
    radioMetros: integer("radio_metros").notNull().default(75),
    geocercaActiva: boolean("geocerca_activa").notNull().default(false),
    tipoGeocerca: varchar("tipo_geocerca", { length: 20 })
      .notNull()
      .default("circular"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("sucursal_estado_idx").on(table.estado)],
);

export const sucursalRelations = relations(sucursal, ({ many }) => ({
  empleados: many(empleado),
}));
