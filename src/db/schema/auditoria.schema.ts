import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export const auditoria = pgTable("auditoria", {
  id: uuid("id").defaultRandom().primaryKey(),
  tabla: varchar("tabla", { length: 60 }).notNull(),
  registroId: text("registro_id").notNull(),
  accion: varchar("accion", { length: 20 }).notNull(),
  antes: jsonb("antes"),
  despues: jsonb("despues"),
  realizadoPor: text("realizado_por")
    .notNull()
    .references(() => user.id),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
