import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";
import { user } from "./auth.schema";

export const solicitudPersonal = pgTable(
  "solicitud_personal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 20 }).notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    diasHabiles: integer("dias_habiles").notNull().default(0),
    motivo: text("motivo"),
    adjuntoUrl: text("adjunto_url"),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    aprobadaPor: text("aprobada_por").references(() => user.id),
    aprobadaEn: timestamp("aprobada_en"),
    notaResolucion: text("nota_resolucion"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("solicitud_personal_empleado_idx").on(table.empleadoId),
    index("solicitud_personal_estado_idx").on(table.estado),
    index("solicitud_personal_tipo_idx").on(table.tipo),
  ],
);

export const solicitudPersonalRelations = relations(
  solicitudPersonal,
  ({ one }) => ({
    empleado: one(empleado, {
      fields: [solicitudPersonal.empleadoId],
      references: [empleado.id],
    }),
    aprobadaPorUser: one(user, {
      fields: [solicitudPersonal.aprobadaPor],
      references: [user.id],
    }),
  }),
);
