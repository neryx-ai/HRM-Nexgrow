-- El factor de horas extra deja de ser un "parámetro del sistema" con
-- categoría propia; pasa a ser una fila más de configuracion_deduccion
-- con tipo='factor', 100% editable y eliminable.
-- Si se elimina, el cálculo usa FACTOR_HORAS_EXTRA_DEFAULT (1.5).

UPDATE configuracion_deduccion
   SET categoria = 'deduccion_legal',
       tipo = 'factor',
       base = NULL
 WHERE clave = 'factorHorasExtra'
   AND (categoria = 'parametro' OR tipo <> 'factor');
