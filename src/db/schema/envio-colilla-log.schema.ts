import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { planilla } from "./planilla.schema";
import { detallePlanilla } from "./detalle-planilla.schema";
import { empleado } from "./empleado.schema";
import { user } from "./auth.schema";

export const envioColillaLog = pgTable(
  "envio_colilla_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planillaId: uuid("planilla_id")
      .notNull()
      .references(() => planilla.id, { onDelete: "cascade" }),
    detallePlanillaId: uuid("detalle_planilla_id")
      .notNull()
      .references(() => detallePlanilla.id, { onDelete: "cascade" }),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    emailDestino: text("email_destino").notNull(),
    exito: boolean("exito").notNull(),
    mensajeError: text("mensaje_error"),
    mensajeId: text("mensaje_id"),
    tipoEnvio: varchar("tipo_envio", { length: 20 })
      .notNull()
      .default("inicial"),
    realizadoPor: text("realizado_por")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("envio_colilla_log_planilla_id_idx").on(table.planillaId),
    index("envio_colilla_log_detalle_planilla_id_idx").on(
      table.detallePlanillaId,
    ),
    index("envio_colilla_log_empleado_id_idx").on(table.empleadoId),
    index("envio_colilla_log_exito_idx").on(table.exito),
  ],
);

export const envioColillaLogRelations = relations(
  envioColillaLog,
  ({ one }) => ({
    planilla: one(planilla, {
      fields: [envioColillaLog.planillaId],
      references: [planilla.id],
    }),
    detallePlanilla: one(detallePlanilla, {
      fields: [envioColillaLog.detallePlanillaId],
      references: [detallePlanilla.id],
    }),
    empleado: one(empleado, {
      fields: [envioColillaLog.empleadoId],
      references: [empleado.id],
    }),
    realizadoPorUser: one(user, {
      fields: [envioColillaLog.realizadoPor],
      references: [user.id],
    }),
  }),
);