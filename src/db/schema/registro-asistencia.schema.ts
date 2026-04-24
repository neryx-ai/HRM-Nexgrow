import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";
import { dispositivoQuiosco } from "./dispositivo-quiosco.schema";
import { user } from "./auth.schema";

export const registroAsistencia = pgTable(
  "registro_asistencia",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 10 }).notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    fuente: varchar("fuente", { length: 20 }).notNull(),
    dispositivoId: uuid("dispositivo_id").references(() => dispositivoQuiosco.id, {
      onDelete: "set null",
    }),
    registradoPor: text("registrado_por").references(() => user.id),
    nota: text("nota"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("registro_asistencia_empleado_id_idx").on(table.empleadoId),
    index("registro_asistencia_dispositivo_id_idx").on(table.dispositivoId),
    index("registro_asistencia_timestamp_idx").on(table.timestamp),
    index("registro_asistencia_tipo_idx").on(table.tipo),
  ],
);

export const registroAsistenciaRelations = relations(
  registroAsistencia,
  ({ one }) => ({
    empleado: one(empleado, {
      fields: [registroAsistencia.empleadoId],
      references: [empleado.id],
    }),
    dispositivo: one(dispositivoQuiosco, {
      fields: [registroAsistencia.dispositivoId],
      references: [dispositivoQuiosco.id],
    }),
    registradoPorUser: one(user, {
      fields: [registroAsistencia.registradoPor],
      references: [user.id],
    }),
  }),
);
