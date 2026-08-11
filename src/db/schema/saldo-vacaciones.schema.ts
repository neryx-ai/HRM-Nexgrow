import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  date,
  timestamp,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { empleado } from "./empleado.schema";
import { user } from "./auth.schema";
import { movimientoSaldoVacacion } from "./movimiento-saldo-vacacion.schema";

export const saldoVacaciones = pgTable(
  "saldo_vacaciones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),
    periodoInicio: date("periodo_inicio").notNull(),
    periodoFin: date("periodo_fin").notNull(),
    diasOtorgados: integer("dias_otorgados").notNull().default(0),
    diasDisponibles: integer("dias_disponibles").notNull().default(0),
    diasUsados: integer("dias_usados").notNull().default(0),
    ultimaActualizacion: timestamp("ultima_actualizacion")
      .notNull()
      .defaultNow(),
    actualizadoPor: text("actualizado_por").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("saldo_vacaciones_empleado_periodo_idx").on(
      table.empleadoId,
      table.periodoInicio,
    ),
    index("saldo_vacaciones_empleado_id_idx").on(table.empleadoId),
  ],
);

export const saldoVacacionesRelations = relations(
  saldoVacaciones,
  ({ one, many }) => ({
    empleado: one(empleado, {
      fields: [saldoVacaciones.empleadoId],
      references: [empleado.id],
    }),
    actualizadoPorUser: one(user, {
      fields: [saldoVacaciones.actualizadoPor],
      references: [user.id],
    }),
    movimientos: many(movimientoSaldoVacacion),
  }),
);
