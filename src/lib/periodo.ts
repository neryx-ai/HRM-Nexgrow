export function formatPeriodoLabel(
  tipo: string,
  fechaInicio: string,
  fechaFin: string,
): string {
  if (tipo === "quincenal") {
    const fechaCierre = new Date(`${fechaFin}T00:00:00`);
    const dia = fechaCierre.getDate();
    const mesAnio = fechaCierre.toLocaleDateString("es-CR", {
      month: "long",
      year: "numeric",
    });
    const mesAnioCapitalizado =
      mesAnio.charAt(0).toUpperCase() + mesAnio.slice(1);
    const quincena = dia > 15 ? "Segunda quincena" : "Primera quincena";
    return `${quincena} de ${mesAnioCapitalizado}`;
  }
  return `Período: ${fechaInicio} a ${fechaFin}`;
}