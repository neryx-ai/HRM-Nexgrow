import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const configuracionDeduccion = pgTable("configuracion_deduccion", {
  id: uuid("id").defaultRandom().primaryKey(),
  clave: text("clave").notNull().unique(),
  valor: text("valor").notNull(),
  descripcion: text("descripcion"),
  activo: boolean("activo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
