import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  date,
  time,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";
import { sucursal } from "./sucursal.schema";
import { puesto } from "./puesto.schema";
import { documentoEmpleado } from "./documento-empleado.schema";

export const empleado = pgTable(
  "empleado",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id"),
    sucursalId: uuid("sucursal_id")
      .notNull()
      .references(() => sucursal.id),
    puestoId: uuid("puesto_id")
      .notNull()
      .references(() => puesto.id),

    nombre: varchar("nombre", { length: 100 }).notNull(),
    apellidos: varchar("apellidos", { length: 100 }).notNull(),
    cedula: varchar("cedula", { length: 20 }).notNull(),
    telefono: varchar("telefono", { length: 20 }),
    fechaNacimiento: date("fecha_nacimiento"),
    direccion: text("direccion"),

    fechaIngreso: date("fecha_ingreso").notNull(),
    salarioBase: numeric("salario_base", { precision: 12, scale: 2 }).notNull(),
    tipoJornada: varchar("tipo_jornada", { length: 20 })
      .notNull()
      .default("completa"),
    horasJornada: integer("horas_jornada").notNull().default(8),

    horaEntrada: time("hora_entrada").notNull().default("08:00:00"),
    horaSalida: time("hora_salida").notNull().default("17:00:00"),

    pin: varchar("pin", { length: 6 }),

    estado: varchar("estado", { length: 20 }).notNull().default("activo"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("empleado_user_id_idx").on(table.userId),
    uniqueIndex("empleado_cedula_idx").on(table.cedula),
    uniqueIndex("empleado_pin_idx").on(table.pin),
    index("empleado_sucursal_id_idx").on(table.sucursalId),
    index("empleado_puesto_id_idx").on(table.puestoId),
    index("empleado_estado_idx").on(table.estado),
  ],
);

export const empleadoRelations = relations(empleado, ({ one, many }) => ({
  user: one(user, {
    fields: [empleado.userId],
    references: [user.id],
  }),
  sucursal: one(sucursal, {
    fields: [empleado.sucursalId],
    references: [sucursal.id],
  }),
  puesto: one(puesto, {
    fields: [empleado.puestoId],
    references: [puesto.id],
  }),
  documentos: many(documentoEmpleado),
}));
