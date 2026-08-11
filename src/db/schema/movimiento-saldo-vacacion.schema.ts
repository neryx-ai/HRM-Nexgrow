import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";
import { user } from "./auth.schema";
import { solicitudPersonal } from "./solicitud-personal.schema";

export const TIPOS_MOVIMIENTO_SALDO = [
  "otorgamiento",
  "ajuste_positivo",
  "ajuste_negativo",
  "devengo",
] as const;

export type TipoMovimientoSaldo = (typeof TIPOS_MOVIMIENTO_SALDO)[number];

export const movimientoSaldoVacacion = pgTable(
  "movimiento_saldo_vacacion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 30 }).notNull(),
    dias: integer("dias").notNull(),
    motivo: text("motivo").notNull(),
    realizadoPor: text("realizado_por")
      .notNull()
      .references(() => user.id),
    fecha: timestamp("fecha").notNull().defaultNow(),
    solicitudPersonalId: uuid("solicitud_personal_id").references(
      () => solicitudPersonal.id,
      { onDelete: "set null" },
    ),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("movimiento_saldo_vacacion_empleado_idx").on(table.empleadoId),
    index("movimiento_saldo_vacacion_tipo_idx").on(table.tipo),
    index("movimiento_saldo_vacacion_fecha_idx").on(table.fecha),
  ],
);

export const movimientoSaldoVacacionRelations = relations(
  movimientoSaldoVacacion,
  ({ one }) => ({
    empleado: one(empleado, {
      fields: [movimientoSaldoVacacion.empleadoId],
      references: [empleado.id],
    }),
    realizadoPorUser: one(user, {
      fields: [movimientoSaldoVacacion.realizadoPor],
      references: [user.id],
    }),
    solicitudPersonal: one(solicitudPersonal, {
      fields: [movimientoSaldoVacacion.solicitudPersonalId],
      references: [solicitudPersonal.id],
    }),
  }),
);
