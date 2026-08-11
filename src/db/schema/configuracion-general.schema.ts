import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export const configuracionGeneral = pgTable(
  "configuracion_general",
  {
    clave: text("clave").primaryKey(),
    valor: text("valor").notNull(),
    descripcion: text("descripcion"),
    actualizadoPor: text("actualizado_por").references(() => user.id),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("configuracion_general_clave_idx").on(table.clave)],
);

export const CLAVES_CONFIGURACION = {
  SABADO_HABIL: "sabado_habil",
} as const;

export type ClaveConfiguracion =
  (typeof CLAVES_CONFIGURACION)[keyof typeof CLAVES_CONFIGURACION];
