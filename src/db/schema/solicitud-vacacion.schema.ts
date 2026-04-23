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
import { saldoVacaciones } from "./saldo-vacaciones.schema";
import { user } from "./auth.schema";

export const solicitudVacacion = pgTable(
  "solicitud_vacacion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    saldoVacacionId: uuid("saldo_vacacion_id")
      .notNull()
      .references(() => saldoVacaciones.id),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    diasHabiles: integer("dias_habiles").notNull(),
    estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
    motivoRechazo: text("motivo_rechazo"),
    aprobadoPor: text("aprobado_por").references(() => user.id),
    aprobadoEn: timestamp("aprobado_en"),
    nota: text("nota"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("solicitud_vacacion_empleado_id_idx").on(table.empleadoId),
    index("solicitud_vacacion_saldo_id_idx").on(table.saldoVacacionId),
    index("solicitud_vacacion_estado_idx").on(table.estado),
    index("solicitud_vacacion_fecha_inicio_idx").on(table.fechaInicio),
  ],
);

export const solicitudVacacionRelations = relations(
  solicitudVacacion,
  ({ one }) => ({
    empleado: one(empleado, {
      fields: [solicitudVacacion.empleadoId],
      references: [empleado.id],
    }),
    saldoVacacion: one(saldoVacaciones, {
      fields: [solicitudVacacion.saldoVacacionId],
      references: [saldoVacaciones.id],
    }),
    aprobadoPorUser: one(user, {
      fields: [solicitudVacacion.aprobadoPor],
      references: [user.id],
    }),
  }),
);
