import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";
import { registroAsistencia } from "./registro-asistencia.schema";
import { sucursal } from "./sucursal.schema";
import { user } from "./auth.schema";

export const notificacionGeo = pgTable(
  "notificacion_geo",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    registroId: uuid("registro_id")
      .notNull()
      .references(() => registroAsistencia.id, { onDelete: "cascade" }),
    sucursalId: uuid("sucursal_id")
      .notNull()
      .references(() => sucursal.id, { onDelete: "cascade" }),
    distanciaM: integer("distancia_m").notNull(),
    resuelta: boolean("resuelta").notNull().default(false),
    resueltaPor: text("resuelta_por").references(() => user.id),
    resueltaEn: timestamp("resuelta_en"),
    accion: varchar("accion", { length: 20 }),
    nota: text("nota"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notificacion_geo_resuelta_idx").on(table.resuelta),
    index("notificacion_geo_empleado_idx").on(table.empleadoId),
    index("notificacion_geo_sucursal_idx").on(table.sucursalId),
  ],
);

export const notificacionGeoRelations = relations(notificacionGeo, ({ one }) => ({
  empleado: one(empleado, {
    fields: [notificacionGeo.empleadoId],
    references: [empleado.id],
  }),
  registro: one(registroAsistencia, {
    fields: [notificacionGeo.registroId],
    references: [registroAsistencia.id],
  }),
  sucursal: one(sucursal, {
    fields: [notificacionGeo.sucursalId],
    references: [sucursal.id],
  }),
  resueltaPorUser: one(user, {
    fields: [notificacionGeo.resueltaPor],
    references: [user.id],
  }),
}));
