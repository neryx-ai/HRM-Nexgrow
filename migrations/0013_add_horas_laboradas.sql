-- Migración: campo horas_laboradas en detalle_planilla
-- Permite que RRHH registre manualmente las horas laboradas del periodo
-- para cada empleado. Default 96 (medio tiempo). Editable en UI solo
-- mientras la planilla esté en estado borrador.

ALTER TABLE detalle_planilla
  ADD COLUMN IF NOT EXISTS horas_laboradas numeric(5, 2) DEFAULT '96' NOT NULL;
