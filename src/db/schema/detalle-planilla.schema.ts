import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { planilla } from "./planilla.schema";
import { empleado } from "./empleado.schema";
import { deduccionAdicional } from "./deduccion-adicional.schema";
import { ingresoExtra } from "./ingreso-extra.schema";

export const detallePlanilla = pgTable(
  "detalle_planilla",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planillaId: uuid("planilla_id")
      .notNull()
      .references(() => planilla.id, { onDelete: "cascade" }),
    empleadoId: uuid("empleado_id")
      .notNull()
      .references(() => empleado.id, { onDelete: "cascade" }),

    salarioBruto: numeric("salario_bruto", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    horasOrdinarias: numeric("horas_ordinarias", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    horasExtra: numeric("horas_extra", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    montoHorasExtra: numeric("monto_horas_extra", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    ccssEmpleado: numeric("ccss_empleado", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    insEmpleado: numeric("ins_empleado", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    impuestoRenta: numeric("impuesto_renta", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    bancoPopular: numeric("banco_popular", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    totalDeduccionesLegales: numeric("total_deducciones_legales", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalDeduccionesAdicionales: numeric("total_deducciones_adicionales", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalIngresosExtras: numeric("total_ingresos_extras", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    salarioNeto: numeric("salario_neto", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    colillaEnviada: numeric("colilla_enviada", { precision: 1, scale: 0 })
      .notNull()
      .default("0"),

    nota: text("nota"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("detalle_planilla_planilla_id_idx").on(table.planillaId),
    index("detalle_planilla_empleado_id_idx").on(table.empleadoId),
  ],
);

export const detallePlanillaRelations = relations(
  detallePlanilla,
  ({ one, many }) => ({
    planilla: one(planilla, {
      fields: [detallePlanilla.planillaId],
      references: [planilla.id],
    }),
    empleado: one(empleado, {
      fields: [detallePlanilla.empleadoId],
      references: [empleado.id],
    }),
    deduccionesAdicionales: many(deduccionAdicional),
    ingresosExtras: many(ingresoExtra),
  }),
);
