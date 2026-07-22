-- Deducciones legales configurables: enriquece configuracion_deduccion
-- y reemplaza las columnas fijas de detalle_planilla por un desglose dinámico.
-- Migración idempotente: se puede aplicar sobre una tabla vacía o sobre
-- una ya migrada parcialmente sin efectos secundarios.

ALTER TABLE configuracion_deduccion ADD COLUMN IF NOT EXISTS nombre varchar(100);
ALTER TABLE configuracion_deduccion ADD COLUMN IF NOT EXISTS tipo varchar(20) NOT NULL DEFAULT 'porcentaje';
ALTER TABLE configuracion_deduccion ADD COLUMN IF NOT EXISTS base varchar(20) DEFAULT 'total_ingresos';
ALTER TABLE configuracion_deduccion ADD COLUMN IF NOT EXISTS categoria varchar(20) NOT NULL DEFAULT 'deduccion_legal';
ALTER TABLE configuracion_deduccion ADD COLUMN IF NOT EXISTS orden integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_deduccion' AND column_name = 'nombre'
  ) THEN
    UPDATE configuracion_deduccion
      SET nombre = 'CCSS Empleado'
      WHERE clave = 'ccssEmpleado' AND (nombre IS NULL OR nombre = '');
    UPDATE configuracion_deduccion
      SET nombre = 'INS Empleado'
      WHERE clave = 'insEmpleado' AND (nombre IS NULL OR nombre = '');
    UPDATE configuracion_deduccion
      SET nombre = 'Banco Popular'
      WHERE clave = 'bancoPopular' AND (nombre IS NULL OR nombre = '');
    UPDATE configuracion_deduccion
      SET nombre = 'Factor Horas Extra'
      WHERE clave = 'factorHorasExtra' AND (nombre IS NULL OR nombre = '');
    UPDATE configuracion_deduccion
      SET nombre = clave
      WHERE nombre IS NULL;

    IF NOT EXISTS (SELECT 1 FROM configuracion_deduccion WHERE nombre IS NULL) THEN
      ALTER TABLE configuracion_deduccion ALTER COLUMN nombre SET NOT NULL;
    END IF;
  END IF;
END $$;

UPDATE configuracion_deduccion SET categoria = 'parametro' WHERE clave = 'factorHorasExtra';
UPDATE configuracion_deduccion SET base = NULL WHERE categoria = 'parametro';

CREATE INDEX IF NOT EXISTS config_deduccion_categoria_idx ON configuracion_deduccion (categoria);
CREATE INDEX IF NOT EXISTS config_deduccion_activo_idx ON configuracion_deduccion (activo);

ALTER TABLE detalle_planilla ADD COLUMN IF NOT EXISTS desglose_deducciones_legales jsonb;

ALTER TABLE detalle_planilla DROP COLUMN IF EXISTS ccss_empleado;
ALTER TABLE detalle_planilla DROP COLUMN IF EXISTS ins_empleado;
ALTER TABLE detalle_planilla DROP COLUMN IF EXISTS banco_popular;
