/**
 * Texto legal para el banner de consentimiento de geolocalización.
 *
 * Costa Rica — Ley 8968 (Protección de la Persona Frente al Tratamiento
 * de sus Datos Personales) trata la geolocalización como dato sensible.
 *
 * El presente texto debe mostrarse al empleado antes de activar la captura
 * de ubicación y referenciarse desde la política de privacidad de Jivis.
 */
export const CONSENTIMIENTO_GEO_TITULO = "Geolocalización en marcaciones";

export const CONSENTIMIENTO_GEO_DESCRIPCION =
  "Para validar tu marcación de asistencia, podemos capturar la ubicación " +
  "aproximada de tu dispositivo. Esta información se utiliza exclusivamente " +
  "para fines de control de asistencia, se almacena con un tiempo de " +
  "retención de 12 meses y no se comparte con terceros.";

export const CONSENTIMIENTO_GEO_DERECHOS =
  "Tenés derecho a solicitar el acceso, rectificación o eliminación de tus " +
  "datos de geolocalización en cualquier momento, conforme a la Ley 8968 " +
  "de Protección de Datos Personales de Costa Rica.";

export const CONSENTIMIENTO_GEO_TEXTO_COMPLETO = [
  CONSENTIMIENTO_GEO_TITULO,
  CONSENTIMIENTO_GEO_DESCRIPCION,
  CONSENTIMIENTO_GEO_DERECHOS,
].join("\n\n");
