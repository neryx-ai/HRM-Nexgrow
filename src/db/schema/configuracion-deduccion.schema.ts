import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const configuracionDeduccion = pgTable(
  "configuracion_deduccion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    clave: text("clave").notNull().unique(),
    tipo: varchar("tipo", { length: 20 }).notNull().default("porcentaje"),
    base: varchar("base", { length: 20 }).default("total_ingresos"),
    valor: text("valor").notNull(),
    descripcion: text("descripcion"),
    categoria: varchar("categoria", { length: 20 })
      .notNull()
      .default("deduccion_legal"),
    orden: integer("orden").notNull().default(0),
    activo: boolean("activo").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("config_deduccion_categoria_idx").on(table.categoria),
    index("config_deduccion_activo_idx").on(table.activo),
  ],
);
