-- Migración: deducciones judiciales recurrentes en empleado
-- Permite que cada empleado tenga pensión alimenticia y/o cobros judiciales
-- con un monto mensual fijo que se inyecta automáticamente al crear la
-- planilla como deduccion_adicional (tipo: descuento_judicial).

ALTER TABLE empleado
  ADD COLUMN IF NOT EXISTS aplica_pension boolean NOT NULL DEFAULT false;

ALTER TABLE empleado
  ADD COLUMN IF NOT EXISTS monto_pension numeric(12, 2);

ALTER TABLE empleado
  ADD COLUMN IF NOT EXISTS aplica_cobros_judiciales boolean NOT NULL DEFAULT false;

ALTER TABLE empleado
  ADD COLUMN IF NOT EXISTS monto_cobros_judiciales numeric(12, 2);