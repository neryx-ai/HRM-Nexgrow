import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sucursal } from "./sucursal.schema";
import { user } from "./auth.schema";

export const dispositivoQuiosco = pgTable(
  "dispositivo_quiosco",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    sucursalId: uuid("sucursal_id")
      .notNull()
      .references(() => sucursal.id),
    tokenHash: text("token_hash").notNull(),
    activadoPor: text("activado_por")
      .notNull()
      .references(() => user.id),
    expiraEn: timestamp("expira_en"),
    activo: boolean("activo").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("dispositivo_quiosco_token_hash_idx").on(table.tokenHash),
    index("dispositivo_quiosco_sucursal_id_idx").on(table.sucursalId),
  ],
);

export const dispositivoQuioscoRelations = relations(
  dispositivoQuiosco,
  ({ one }) => ({
    sucursal: one(sucursal, {
      fields: [dispositivoQuiosco.sucursalId],
      references: [sucursal.id],
    }),
    activadoPorUser: one(user, {
      fields: [dispositivoQuiosco.activadoPor],
      references: [user.id],
    }),
  }),
);
