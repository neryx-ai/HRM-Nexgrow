import {
  pgTable,
  uuid,
  varchar,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tramoRenta = pgTable(
  "tramo_renta",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    limiteInferior: numeric("limite_inferior", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    limiteSuperior: numeric("limite_superior", { precision: 12, scale: 2 }),
    porcentaje: numeric("porcentaje", { precision: 5, scale: 2 }).notNull(),
    montoExcedente: numeric("monto_excedente", {
      precision: 12,
      scale: 2,
    }).notNull(),
    descripcion: varchar("descripcion", { length: 200 }),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("tramo_renta_activo_idx").on(table.activo)],
);

export const tramoRentaRelations = relations(tramoRenta, ({}) => ({}));
