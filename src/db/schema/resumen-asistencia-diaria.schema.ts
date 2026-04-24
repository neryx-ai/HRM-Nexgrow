import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  date,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";

export const resumenAsistenciaDiaria = pgTable(
  "resumen_asistencia_diaria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    fecha: date("fecha").notNull(),
    horasOrdinarias: numeric("horas_ordinarias", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    horasExtra: numeric("horas_extra", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    ausente: boolean("ausente").notNull().default(false),
    tieneEntrada: boolean("tiene_entrada").notNull().default(false),
    tieneSalida: boolean("tiene_salida").notNull().default(false),
    horaEntrada: timestamp("hora_entrada"),
    horaSalida: timestamp("hora_salida"),
    retraso: boolean("retraso").notNull().default(false),
    minutosRetraso: numeric("minutos_retraso", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("resumen_asistencia_empleado_fecha_idx").on(
      table.empleadoId,
      table.fecha,
    ),
    index("resumen_asistencia_fecha_idx").on(table.fecha),
  ],
);

export const resumenAsistenciaDiariaRelations = relations(
  resumenAsistenciaDiaria,
  ({ one }) => ({
    empleado: one(empleado, {
      fields: [resumenAsistenciaDiaria.empleadoId],
      references: [empleado.id],
    }),
  }),
);
