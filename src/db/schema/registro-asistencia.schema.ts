import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  doublePrecision,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";
import { dispositivoQuiosco } from "./dispositivo-quiosco.schema";
import { user } from "./auth.schema";
import { sucursal } from "./sucursal.schema";

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

    latEmpleado: doublePrecision("lat_empleado"),
    lngEmpleado: doublePrecision("lng_empleado"),
    precisionMetros: doublePrecision("precision_metros"),
    fuenteCoordenada: varchar("fuente_coordenada", { length: 20 })
      .notNull()
      .default("no-enviada"),
    distanciaSucursalM: integer("distancia_sucursal_m"),
    dentroGeocerca: boolean("dentro_geocerca"),
    fueraDeGeocerca: boolean("fuera_de_geocerca").notNull().default(false),
    sucursalId: uuid("sucursal_id").references(() => sucursal.id, {
      onDelete: "set null",
    }),
    ipOrigen: text("ip_origen"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("registro_asistencia_empleado_id_idx").on(table.empleadoId),
    index("registro_asistencia_dispositivo_id_idx").on(table.dispositivoId),
    index("registro_asistencia_timestamp_idx").on(table.timestamp),
    index("registro_asistencia_tipo_idx").on(table.tipo),
    index("registro_asistencia_fuera_geocerca_idx").on(table.fueraDeGeocerca),
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
    sucursal: one(sucursal, {
      fields: [registroAsistencia.sucursalId],
      references: [sucursal.id],
    }),
  }),
);
